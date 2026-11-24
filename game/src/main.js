// Solmar Bay: the entry point. Builds the world, runs the loop, and wires
// every system together — the player on foot, vehicles, police, missions,
// the HUD and the menus. Shot mode (?shot=) skips the menu and stages a
// scripted scene for the screenshots.

const THREE = window.THREE;
import { START, GARAGE } from './config.js';
import { makeRng } from './rng.js';
import { loadSave, writeSave } from './save.js';
import { createInput, keyHeld, keyPressed, clearPressed, moveAxes } from './input.js';
import { createAudio, ensureAudio, updateEngineSound } from './audio.js';
import { buildCity, updateDayNight, isWater, groundHeight, resolveCollision } from './city.js';
import { spawnParkedVehicles, nearestVehicle, enterVehicle, exitVehicle, updateVehicle } from './cars.js';
import { spawnTraffic, updateTraffic } from './traffic.js';
import { spawnPeds, updatePeds } from './peds.js';
import { updateWanted, updatePolice, addWanted } from './police.js';
import { createCombat, shoot, updateCombat } from './combat.js';
import { startMission, updateMission, showMessage } from './missions.js';
import { buildHud, showScreen, updateHud } from './hud.js';
import { createRenderer, updateCamera } from './render.js';
import { parseShot, applyShot } from './shots.js';

function buildPlayerMesh(G) {
  const group = new THREE.Group();
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.4), new THREE.MeshLambertMaterial({ color: 0x2a3542 }));
  legs.position.y = 0.42;
  group.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.42), new THREE.MeshLambertMaterial({ color: 0xc23a2e }));
  torso.position.y = 1.28;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8b48c }));
  head.position.y = 1.95;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 10), new THREE.MeshLambertMaterial({ color: 0x1a2a4a }));
  cap.position.y = 2.18;
  group.add(cap);
  G.scene.add(group);
  return group;
}

function createGame() {
  const G = {
    THREE,
    elapsed: 0,
    dayT: 0.42,
    mode: 'menu',
    rng: makeRng(20261124),
    player: {
      pos: new THREE.Vector3(START.pos.x, 0, START.pos.z),
      angle: START.angle,
      onFoot: true,
      health: 100,
      maxHealth: 100,
      cash: 0,
      vehicle: null,
      vy: 0,
      grounded: true,
    },
    vehicles: [],
    traffic: [],
    peds: [],
    police: [],
    heli: null,
    wanted: 0,
    wantedTimer: 0,
    mission: null,
    completed: [],
    upgrades: { engine: false, armor: false },
    stats: { crimes: 0, fares: 0 },
    messages: [],
    cameraYaw: START.angle,
    orbitX: 0,
    orbitY: 0.25,
    cameraOverride: null,
    shotAutoDrive: false,
    faresUnlocked: false,
    fare: null,
    fareCooldown: 0,
    nearVehicle: null,
    nearGarage: false,
    bustedFine: 0,
    isNight: false,
    frames: 0,
  };
  G.audio = createAudio();
  G.input = createInput();
  G.combat = createCombat(G);
  createRenderer(G);
  G.scene = new THREE.Scene();
  buildCity(G);
  spawnParkedVehicles(G);
  spawnTraffic(G);
  spawnPeds(G);
  G.playerMesh = buildPlayerMesh(G);
  buildHud(G);
  return G;
}

function updatePlayerOnFoot(G, dt) {
  const input = G.input;
  const axes = moveAxes(input);
  const speed = keyHeld(input, 'ShiftLeft') || keyHeld(input, 'ShiftRight') ? 10 : 6;
  // Movement is relative to the camera, so W always walks away from it.
  const cy = G.cameraYaw;
  const fx = -Math.sin(cy);
  const fz = -Math.cos(cy);
  const rx = Math.cos(cy);
  const rz = -Math.sin(cy);
  let mx = fx * -axes.z + rx * axes.x;
  let mz = fz * -axes.z + rz * axes.x;
  const len = Math.sqrt(mx * mx + mz * mz);
  if (len > 0.01) {
    mx /= len;
    mz /= len;
    const nx = G.player.pos.x + mx * speed * dt;
    const nz = G.player.pos.z + mz * speed * dt;
    if (!isWater(nx, nz)) {
      G.player.pos.x = nx;
      G.player.pos.z = nz;
    }
    G.player.angle = Math.atan2(-mx, -mz);
    G.playerMesh.position.y = Math.abs(Math.sin(G.elapsed * 10)) * 0.06;
  }
  // Jump.
  if (keyPressed(input, 'Space') && G.player.grounded) {
    G.player.vy = 7;
    G.player.grounded = false;
  }
  if (!G.player.grounded) {
    G.player.vy -= 22 * dt;
    G.player.pos.y += G.player.vy * dt;
    const ground = groundHeight(G.player.pos.x, G.player.pos.z);
    if (G.player.pos.y <= ground) {
      G.player.pos.y = ground;
      G.player.vy = 0;
      G.player.grounded = true;
    }
  } else {
    G.player.pos.y = groundHeight(G.player.pos.x, G.player.pos.z);
  }
  resolveCollision(G, G.player.pos, 0.7);
  G.playerMesh.position.set(G.player.pos.x, G.player.pos.y, G.player.pos.z);
  G.playerMesh.rotation.y = G.player.angle;
}

function updatePlayerVehicle(G, dt) {
  const input = G.input;
  const v = G.player.vehicle;
  const axes = moveAxes(input);
  let throttle = 0;
  let brake = false;
  if (G.shotAutoDrive) {
    throttle = 1;
  } else {
    if (axes.z < 0) throttle = 1;
    if (axes.z > 0) brake = true;
    if (keyHeld(input, 'Space')) brake = true;
  }
  const steer = G.shotAutoDrive ? 0 : -axes.x;
  updateVehicle(G, v, dt, throttle, steer, brake);
  G.player.pos.copy(v.pos);
  G.player.angle = v.angle;
  updateEngineSound(G.audio, Math.abs(v.speed), v.spec.topSpeed, true);
}

function handleInteract(G) {
  const input = G.input;
  if (!keyPressed(input, 'KeyE')) return;
  if (G.player.vehicle) {
    if (G.nearGarage) {
      G.mode = 'garage';
      showScreen(G, 'garage');
      return;
    }
    exitVehicle(G);
    updateEngineSound(G.audio, 0, 1, false);
    return;
  }
  if (G.nearVehicle) {
    const v = G.nearVehicle;
    enterVehicle(G, v);
    if (v.kind !== 'boat') {
      addWanted(G, 1);
      G.stats.crimes += 1;
      showMessage(G, `You stole the ${v.spec.name}. The PD noticed.`, 3);
    }
    return;
  }
  if (G.nearGarage) {
    showMessage(G, 'The garage works on cars — bring one in.', 3);
  }
}

function buyFromGarage(G, what) {
  const v = G.player.vehicle;
  if (what === 'repair') {
    if (!v || v.damage <= 0) return;
    if (G.player.cash < GARAGE.repairCost) {
      showMessage(G, 'Not enough cash for repairs.', 3);
      return;
    }
    G.player.cash -= GARAGE.repairCost;
    v.damage = 0;
    if (v.smoke) {
      v.mesh.remove(v.smoke);
      v.smoke = null;
    }
    showMessage(G, 'Repaired — good as new.', 3);
  } else if (what === 'engine') {
    if (G.upgrades.engine || G.player.cash < GARAGE.engineCost) {
      showMessage(G, G.upgrades.engine ? 'Engine upgrade already owned.' : 'Not enough cash for the engine upgrade.', 3);
      return;
    }
    G.player.cash -= GARAGE.engineCost;
    G.upgrades.engine = true;
    showMessage(G, 'Engine upgrade fitted — +25% top speed.', 4);
  } else if (what === 'armor') {
    if (G.upgrades.armor || G.player.cash < GARAGE.armorCost) {
      showMessage(G, G.upgrades.armor ? 'Armor already owned.' : 'Not enough cash for armor.', 3);
      return;
    }
    G.player.cash -= GARAGE.armorCost;
    G.upgrades.armor = true;
    G.player.maxHealth += GARAGE.armorBonus;
    G.player.health = Math.min(G.player.maxHealth, G.player.health + GARAGE.armorBonus);
    showMessage(G, 'Armor fitted — +50 max health.', 4);
  }
  writeSave(G);
  showScreen(G, 'garage');
}

function startGame(G, useSave) {
  ensureAudio(G.audio);
  if (useSave) {
    const save = loadSave();
    if (save) {
      G.player.cash = save.cash;
      G.completed = save.completed;
      G.upgrades = save.upgrades;
      G.stats.fares = save.fares;
      if (save.upgrades.armor) {
        G.player.maxHealth = 100 + GARAGE.armorBonus;
        G.player.health = G.player.maxHealth;
      }
    }
  }
  G.mode = 'play';
  showScreen(G, null);
  const next = G.completed.length;
  startMission(G, next);
  document.getElementById('status').textContent = 'ready';
}

function main() {
  const G = createGame();
  const shot = parseShot();
  const statusEl = document.getElementById('status');
  const save = loadSave();
  const continueBtn = document.getElementById('continue-btn');
  if (continueBtn) continueBtn.style.display = save ? 'inline-block' : 'none';

  G.ui.onStart = (useSave) => startGame(G, useSave);
  G.ui.onResume = () => {
    G.mode = 'play';
    showScreen(G, null);
  };
  G.ui.onRespawn = () => {
    G.mode = 'play';
    showScreen(G, null);
    showMessage(G, 'Back on the streets. Lay low for a while.', 4);
  };
  G.ui.onGarageClose = () => {
    G.mode = 'play';
    showScreen(G, null);
  };
  G.ui.onGarageBuy = (what) => buyFromGarage(G, what);

  window.addEventListener('mousedown', (event) => {
    if (event.button === 0 && G.mode === 'play' && G.player.onFoot) {
      ensureAudio(G.audio);
      shoot(G);
    }
  });

  if (shot.shot) {
    // Screenshot staging: straight into the game, no menu.
    G.mode = 'play';
    showScreen(G, null);
    applyShot(G, shot.shot);
    G.playerMesh.visible = !G.player.vehicle;
  }

  const clock = new THREE.Clock();
  let firstFrame = true;

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    G.elapsed += dt;
    G.frames += 1;

    if (G.mode === 'menu') {
      // Slow orbit over the plaza behind the start screen.
      G.camera.position.set(Math.cos(G.elapsed * 0.05) * 90, 42, Math.sin(G.elapsed * 0.05) * 90);
      G.camera.lookAt(0, 2, 0);
      updateTraffic(G, dt);
      updatePeds(G, dt);
      updateDayNight(G, dt);
    } else if (G.mode === 'play') {
      const input = G.input;
      // Pause.
      if (keyPressed(input, 'KeyP') || keyPressed(input, 'Escape')) {
        G.mode = 'pause';
        showScreen(G, 'pause');
      } else {
        // Proximity for the E key.
        G.nearVehicle = G.player.onFoot ? nearestVehicle(G, G.player.pos, 4.5) : null;
        const dx = G.player.pos.x - GARAGE.pos.x;
        const dz = G.player.pos.z - GARAGE.pos.z;
        G.nearGarage = Math.sqrt(dx * dx + dz * dz) < 12;
        handleInteract(G);
        if (G.player.onFoot) updatePlayerOnFoot(G, dt);
        else updatePlayerVehicle(G, dt);
        G.playerMesh.visible = G.player.onFoot;
        G.playerMesh.position.set(G.player.pos.x, G.player.pos.y, G.player.pos.z);
        updateTraffic(G, dt);
        updatePeds(G, dt);
        updateWanted(G, dt);
        updatePolice(G, dt);
        updateCombat(G, dt);
        updateMission(G, dt);
        updateDayNight(G, dt);
        updateCamera(G, dt);
        // Slow health recovery while the heat is off.
        if (G.wanted === 0 && G.player.health < G.player.maxHealth) {
          G.player.health = Math.min(G.player.maxHealth, G.player.health + 2 * dt);
        }
        updateHud(G);
      }
    } else if (G.mode === 'busted') {
      updateCamera(G, dt);
      updateHud(G);
    }

    if (G.mode !== 'menu') {
      // The menu orbit already positioned the camera; otherwise render.
    }
    G.renderer.render(G.scene, G.camera);
    if (firstFrame) {
      firstFrame = false;
      statusEl.textContent = 'ready';
    }
    if (shot.shot && G.frames === 150) {
      window.__shotReady = true;
    }
    clearPressed(G.input);
  }
  frame();
}

main();
