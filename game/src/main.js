// Solmar Bay — boot, game loop and the player.
// Rico Vega on foot and behind the wheel: walk/run/jump, enter and steal
// cars, drive, punch, shoot. The game runs on a fixed 1/60 s step with a
// title screen, pause menu, busted/wasted screens and autosave. The same
// file stages the four screenshot scenes (?shot=start|play|chase|mission).

import { COLORS, MISSIONS, PLACES, TUNE, WORLD, angleLerp, clamp, dist2 } from './config.js';
import { RNG } from './rng.js';
import { buildCity, collideCircle } from './city.js';
import { Car } from './cars.js';
import { Traffic } from './traffic.js';
import { Pedestrians } from './peds.js';
import { Police } from './police.js';
import { Combat } from './combat.js';
import { Missions } from './missions.js';
import { AudioSys } from './audio.js';
import { HUD } from './hud.js';
import { Renderer3D } from './render.js';
import { createInput, EDGE_ENTER, EDGE_JUMP, EDGE_MUTE, EDGE_PAUSE, EDGE_PUNCH, EDGE_RELOAD, EDGE_START, EDGE_WEAPON } from './input.js';
import { loadSave, autosave } from './save.js';
import { stageShot } from './shots.js';

const T = window.THREE;
const STEP = 1 / 60;
const MAX_FRAME = 0.25;

// The player on foot: a simple low-poly Rico (jacket, jeans, cap).
function makePlayerMesh() {
  const group = new T.Group();
  const jacket = new T.MeshLambertMaterial({ color: 0x2e5a8a });
  const jeans = new T.MeshLambertMaterial({ color: 0x2a2a3a });
  const skin = new T.MeshLambertMaterial({ color: 0xe8b88a });
  for (const s of [-1, 1]) {
    const leg = new T.Mesh(new T.BoxGeometry(0.17, 0.82, 0.17), jeans);
    leg.position.set(s * 0.13, 0.41, 0);
    group.add(leg);
  }
  const torso = new T.Mesh(new T.BoxGeometry(0.6, 0.75, 0.34), jacket);
  torso.position.y = 1.2;
  torso.castShadow = true;
  group.add(torso);
  const head = new T.Mesh(new T.SphereGeometry(0.25, 10, 8), skin);
  head.position.y = 1.82;
  head.castShadow = true;
  group.add(head);
  const cap = new T.Mesh(
    new T.CylinderGeometry(0.27, 0.27, 0.1, 10),
    new T.MeshLambertMaterial({ color: 0xc23a2e }),
  );
  cap.position.y = 2.02;
  group.add(cap);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new T.Mesh(new T.BoxGeometry(0.14, 0.66, 0.14), jacket);
    arm.position.set(s * 0.38, 1.2, 0);
    group.add(arm);
    arms.push(arm);
  }
  return { group, arms };
}

export class Game {
  constructor() {
    const saved = loadSave();
    this.cash = saved.cash;
    this.time = 0;
    this.wanted = 0;
    this.lastCrimeAt = -999;
    this.decayTimer = 0;
    this.hurtFlash = 0;
    this.state = 'title'; // title | playing | paused | busted | wasted
    this.shakeAmount = 0;

    this.canvas = document.getElementById('game');
    this.renderer = new Renderer3D(this.canvas);
    this.scene = this.renderer.scene;
    this.camera = this.renderer.camera;
    this.rng = new RNG(WORLD.SEED);
    this.audio = new AudioSys();
    this.audio.setMuted(saved.muted);
    this.input = createInput(this.canvas);

    // World + systems.
    const city = buildCity(this.scene);
    this.colliders = city.colliders;
    this.traffic = new Traffic(this.scene, this.rng, this.colliders);
    this.traffic.spawn(TUNE.trafficCount);
    this.peds = new Pedestrians(this.scene, this.rng.fork(), this.colliders);
    this.peds.spawn(TUNE.pedCount);
    this.police = new Police(this.scene, this.rng, this.colliders, this);
    this.combat = new Combat(this.scene, this);
    this.missions = new Missions(this.scene, this);
    this.missions.done = saved.done.slice();
    this.missions.bestDone = saved.bestMission;
    this.hud = new HUD(this);

    // The player.
    const pm = makePlayerMesh();
    this.playerMesh = pm.group;
    this.playerArms = pm.arms;
    this.scene.add(this.playerMesh);
    this.player = {
      x: PLACES.spawn.x, z: PLACES.spawn.z, heading: Math.PI,
      hp: TUNE.playerHp, inCar: false, car: null,
      vy: 0, grounded: true, walkPhase: 0,
    };
    this.playerMesh.position.set(this.player.x, 0, this.player.z);
    this.playerMesh.rotation.y = this.player.heading;

    // Parked cars the player can steal (a red sedan right by the spawn).
    this.parked = [];
    const starter = new Car(this.scene, this.rng, 6, 150, Math.PI, false);
    this.parked.push(starter);
    for (let i = 0; i < 5; i += 1) {
      const road = this.rng.pick([-162, -108, -54, 0, 54, 108, 162]);
      const along = this.rng.range(-220, 220);
      const car = new Car(this.scene, this.rng,
        this.rng.chance(0.5) ? road + 3.4 : along,
        this.rng.chance(0.5) ? along : road + 3.4,
        this.rng.range(0, Math.PI * 2), false);
      this.parked.push(car);
    }

    // Cash pickups ($50) scattered on sidewalks.
    this.pickups = [];
    const pickupMat = new T.MeshLambertMaterial({ color: COLORS.pickup, emissive: 0x1a5a1a });
    for (let i = 0; i < TUNE.cashPickupCount; i += 1) {
      const mesh = new T.Mesh(new T.BoxGeometry(0.7, 0.25, 0.45), pickupMat);
      const road = this.rng.pick([-162, -108, -54, 0, 54, 108, 162]);
      const along = this.rng.range(-220, 220);
      const x = this.rng.chance(0.5) ? road + 10 : along;
      const z = this.rng.chance(0.5) ? along : road + 10;
      mesh.position.set(clamp(x, -250, 250), 0.5, clamp(z, -250, 250));
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.pickups.push({ mesh, x: mesh.position.x, z: mesh.position.z, taken: false, respawn: 0 });
    }

    this.hud.showTitle(this.cash, this.missions.bestDone);
    this.announce('Solmar Bay. Press Space or click to start.');

    // Test + debug hooks (read-only state for the play-tests; the game
    // itself never calls these).
    window.__game = this;
  }

  announce(text) {
    const status = document.getElementById('status');
    if (status) status.textContent = text;
    this.hud.say(text);
  }

  say(text) { this.hud.say(text); }
  save() { autosave(this); }
  shake(amount) { this.renderer.shake(amount); }

  damagePlayer(amount, source) {
    if (this.state !== 'playing') return;
    this.player.hp -= amount;
    this.hurtFlash = 0.5;
    this.shake(0.3);
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.wasted();
    }
  }

  busted() {
    if (this.state !== 'playing') return;
    const fine = Math.min(this.cash, TUNE.bustedFine);
    this.cash -= fine;
    this.wanted = 0;
    this.police.clearAll();
    this.combat.clearThugs();
    if (this.player.inCar) this.exitCar();
    this.respawn();
    this.state = 'busted';
    this.hud.showEnd('busted', fine);
    this.audio.fail();
    this.save();
  }

  wasted() {
    if (this.state !== 'playing') return;
    const fine = Math.min(this.cash, TUNE.wastedFine);
    this.cash -= fine;
    this.wanted = Math.floor(this.wanted / 2);
    this.police.clearAll();
    this.combat.clearThugs();
    if (this.player.inCar) this.exitCar();
    this.respawn();
    this.state = 'wasted';
    this.hud.showEnd('wasted', fine);
    this.audio.fail();
    this.save();
  }

  respawn() {
    this.player.hp = TUNE.playerHp;
    this.player.x = PLACES.spawn.x;
    this.player.z = PLACES.spawn.z;
    this.player.heading = Math.PI;
    this.player.vy = 0;
    this.playerMesh.position.set(this.player.x, 0, this.player.z);
    this.renderer.snap(this.player);
  }

  startGame() {
    this.audio.ensure();
    this.audio.click();
    this.state = 'playing';
    this.hud.hideTitle();
    this.hud.hideEnd();
    if (!this.missions.current && this.missions.done.length === 0) {
      this.missions.start(1);
    } else if (!this.missions.current) {
      this.say('Welcome back to Solmar Bay — press P for the job list.');
    }
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.reset(); // no stuck keys while paused
    this.hud.showPause();
    this.save();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.hud.hidePause();
  }

  // ---- Entering / exiting cars -------------------------------------------
  nearestStealable(maxDist = 4) {
    let best = null;
    let bestD = maxDist;
    const consider = (car) => {
      if (!car || car.dead || car.police) return;
      const d = dist2(this.player.x, this.player.z, car.x, car.z);
      if (d < bestD) { bestD = d; best = car; }
    };
    for (const car of this.parked) consider(car);
    const t = this.traffic.nearest(this.player.x, this.player.z, maxDist);
    if (t) consider(t);
    return best;
  }

  enterCar(car) {
    this.player.inCar = true;
    this.player.car = car;
    this.playerMesh.visible = false;
    this.player.x = car.x;
    this.player.z = car.z;
    this.player.heading = car.heading;
    this.police.addWanted(1); // stealing a car is a crime, stars rise
    this.audio.blip(440, 660, 0.12, 0.18);
    this.say('Car stolen — the cops noticed. Drive!');
  }

  exitCar() {
    const car = this.player.car;
    if (!car) return;
    this.player.inCar = false;
    this.player.car = null;
    this.player.x = car.x + Math.sin(car.heading + Math.PI / 2) * 2.5;
    this.player.z = car.z + Math.cos(car.heading + Math.PI / 2) * 2.5;
    this.player.heading = car.heading;
    this.playerMesh.visible = true;
    this.playerMesh.position.set(this.player.x, 0, this.player.z);
  }

  // ---- Per-frame update ----------------------------------------------------
  update(dt) {
    this.time += dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    const edges = this.input.takeEdges();

    if (this.state === 'title') {
      if (edges & (EDGE_START | EDGE_JUMP)) this.startGame();
      this.idleWorld(dt);
      return;
    }
    if (this.state === 'busted' || this.state === 'wasted') {
      if (edges & (EDGE_START | EDGE_JUMP)) {
        this.state = 'playing';
        this.hud.hideEnd();
        this.say('Back on the streets. Stay out of trouble, Rico.');
      }
      this.idleWorld(dt);
      return;
    }
    if (this.state === 'paused') {
      if (edges & EDGE_PAUSE) this.resume();
      return;
    }

    // Playing.
    if (edges & EDGE_PAUSE) { this.pause(); return; }
    if (edges & EDGE_MUTE) {
      this.audio.setMuted(!this.audio.muted);
      this.say(this.audio.muted ? 'Sound off.' : 'Sound on.');
      this.save();
    }
    if (edges & EDGE_WEAPON) {
      this.combat.setWeapon(this.combat.weapon === 'pistol' ? 'fists' : 'pistol');
      this.say(this.combat.weapon === 'pistol' ? 'Pistol out.' : 'Fists out.');
    }
    if (edges & EDGE_RELOAD) this.combat.reload();
    if (edges & EDGE_ENTER) {
      if (this.player.inCar) this.exitCar();
      else {
        const car = this.nearestStealable();
        if (car) this.enterCar(car);
        else this.say('No car close enough — walk up to one and press E.');
      }
    }

    const move = this.input.move();
    if (this.player.inCar) this.updateDriving(dt, move);
    else this.updateOnFoot(dt, move, edges);

    // Shooting: hold the mouse button to fire the pistol.
    if (this.input.mouseHeld() && this.combat.weapon === 'pistol' && !this.player.inCar) {
      const hx = Math.sin(this.player.heading);
      const hz = Math.cos(this.player.heading);
      this.combat.fire({ x: this.player.x, z: this.player.z }, hx, hz);
    } else if (edges & EDGE_PUNCH) {
      const hx = Math.sin(this.player.heading);
      const hz = Math.cos(this.player.heading);
      this.combat.fire({ x: this.player.x, z: this.player.z }, hx, hz);
    }

    this.traffic.update(dt, this.player.x, this.player.z);
    this.peds.update(dt, this.traffic.cars);
    // A traffic car stuck behind the player honks every few seconds.
    this.hornTimer = (this.hornTimer || 0) - dt;
    if (this.hornTimer <= 0 && this.traffic.cars.some((c) => c.blockedByPlayer)) {
      this.hornTimer = 4;
      this.audio.horn();
    }
    const nearestPolice = this.police.update(dt);
    this.combat.update(dt);
    this.missions.update(dt);
    this.updatePickups(dt);
    this.audio.update(dt, this.player.inCar && this.player.car ? this.player.car.speedKmh : 0, nearestPolice);
    this.renderer.follow(dt, this.player);
    this.hud.update(dt);
  }

  // The world keeps moving behind the title / busted / wasted screens.
  idleWorld(dt) {
    this.traffic.update(dt, this.player.x, this.player.z);
    this.peds.update(dt, this.traffic.cars);
    this.renderer.follow(dt, this.player);
    this.hud.update(dt);
  }

  updateOnFoot(dt, move, edges) {
    const p = this.player;
    const speed = this.input.running() ? TUNE.runSpeed : TUNE.walkSpeed;
    // Movement is relative to the camera: W goes away from the camera,
    // D goes to the screen's right, whatever way the player faces.
    const hx = Math.sin(p.heading);
    const hz = Math.cos(p.heading);
    const dx = hx * move.fwd - hz * move.right;
    const dz = hz * move.fwd + hx * move.right;
    const moving = move.fwd !== 0 || move.right !== 0;
    if (moving) {
      const targetHeading = Math.atan2(dx, dz);
      p.heading = angleLerp(p.heading, targetHeading, 1 - Math.pow(0.001, dt));
      const step = speed * dt;
      let nx = p.x + Math.sin(p.heading) * step;
      let nz = p.z + Math.cos(p.heading) * step;
      nx = clamp(nx, WORLD.BEACH_X + 4, WORLD.CITY_HALF);
      nz = clamp(nz, -WORLD.CITY_HALF, WORLD.CANAL_Z + 2);
      const res = collideCircle(this.colliders, nx, nz, 0.55);
      p.x = res.x;
      p.z = res.z;
      p.walkPhase += dt * speed * 1.6;
    }
    // Jump with gravity.
    if ((edges & EDGE_JUMP) && p.grounded) {
      p.vy = TUNE.jumpSpeed;
      p.grounded = false;
    }
    if (!p.grounded) {
      p.vy -= TUNE.gravity * dt;
      const y = this.playerMesh.position.y + p.vy * dt;
      if (y <= 0) {
        this.playerMesh.position.y = 0;
        p.vy = 0;
        p.grounded = true;
      } else {
        this.playerMesh.position.y = y;
      }
    }
    // Walk animation: arms swing, slight bob.
    const swing = moving ? Math.sin(p.walkPhase) * 0.55 : 0;
    this.playerArms[0].rotation.x = swing;
    this.playerArms[1].rotation.x = -swing;
    this.playerMesh.position.set(p.x, this.playerMesh.position.y, p.z);
    this.playerMesh.rotation.y = p.heading;
    // Traffic can hit a pedestrian player: a bump costs HP and stars rise.
    const car = this.traffic.nearest(p.x, p.z, 2.2);
    if (car && Math.abs(car.speed) > 3) {
      this.damagePlayer(12, 'traffic');
      this.police.addWanted(1);
      this.peds.scare(p.x, p.z, 20);
      // Shove the player clear of the car.
      const d = Math.max(dist2(p.x, p.z, car.x, car.z), 0.1);
      p.x = car.x + ((p.x - car.x) / d) * 3;
      p.z = car.z + ((p.z - car.z) / d) * 3;
    }
  }

  updateDriving(dt, move) {
    const p = this.player;
    const car = p.car;
    if (!car) { this.player.inCar = false; return; }
    const throttle = move.fwd;
    const steer = -move.right; // steering is inverted vs the heading axis
    const hit = car.drive(dt, throttle, steer, this.colliders);
    if (hit && Math.abs(car.speed) > 8) {
      this.shake(0.35);
      this.audio.blip(120, 60, 0.15, 0.3);
      this.peds.scare(car.x, car.z, 14);
    }
    // Running over a pedestrian while driving: a crime, and HP for the ped.
    const ped = this.peds.nearest(car.x, car.z, 2.4);
    if (ped && Math.abs(car.speed) > 4) {
      this.peds.kill(ped);
      this.police.addWanted(2);
      this.say('You ran someone over — the whole city saw that.');
      this.shake(0.4);
    }
    // Police cars ramming the player's car damage it.
    p.x = car.x;
    p.z = car.z;
    p.heading = car.heading;
    // A wrecked car (damage 1) stalls: the player must get out and find another.
    if (car.damage >= 1) {
      this.say('This wreck is done — find another car.');
      this.exitCar();
    }
  }

  updatePickups(dt) {
    for (const p of this.pickups) {
      if (p.taken) {
        p.respawn -= dt;
        if (p.respawn <= 0) {
          p.taken = false;
          p.mesh.visible = true;
        }
        continue;
      }
      // Spin the pickup so it catches the eye.
      p.mesh.rotation.y += dt * 2;
      p.mesh.position.y = 0.5 + Math.sin(this.time * 3 + p.x) * 0.12;
      if (dist2(this.player.x, this.player.z, p.x, p.z) < 2.4) {
        p.taken = true;
        p.respawn = TUNE.pickupRespawn;
        p.mesh.visible = false;
        this.cash += TUNE.pickupValue;
        this.audio.pickup();
        this.say(`Cash pickup: +$${TUNE.pickupValue}.`);
        this.save();
      }
    }
  }

  // ---- Debug helpers for the play-tests (not used by the game itself). ----
  debugTeleport(x, z, heading) {
    if (this.player.inCar) this.exitCar();
    this.player.x = x;
    this.player.z = z;
    if (heading !== undefined) this.player.heading = heading;
    this.playerMesh.position.set(x, 0, z);
    this.renderer.snap(this.player);
  }
  debugDriveTo(x, z) {
    // Teleport the player's car next to a point (for mission leg tests).
    if (!this.player.inCar) {
      const car = this.nearestStealable(9999) || this.parked[0];
      this.enterCar(car);
    }
    this.player.car.x = x;
    this.player.car.z = z;
    this.player.car.speed = 0;
    this.player.x = x;
    this.player.z = z;
    this.renderer.snap(this.player);
  }
  debugStartMission(id) { return this.missions.start(id); }
  debugSetWanted(n) { this.wanted = n; this.lastCrimeAt = this.time; }
  debugSetMissionTimer(s) { this.missions.timer = s; }
  debugSetHp(hp) { this.player.hp = hp; }
}

// ---- Boot ------------------------------------------------------------------
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

const game = new Game();

if (shotName) {
  // Screenshot mode: stage the scene, paint it, freeze it, signal ready.
  stageShot(game, shotName);
  game.renderer.render();
  window.__shotReady = true;
  // Keep painting the same frozen frame so the canvas never goes blank.
  const frozen = () => {
    game.renderer.render();
    requestAnimationFrame(frozen);
  };
  requestAnimationFrame(frozen);
} else {
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    while (accumulator >= STEP) {
      game.update(STEP);
      accumulator -= STEP;
    }
    game.renderer.render();
  }
  // Leaving the tab pauses a running game rather than letting the city run on.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === 'playing') game.pause();
  });
  requestAnimationFrame(frame);
}
