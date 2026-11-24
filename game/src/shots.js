// Shot staging: scripted game states for the four screenshots (?shot=…).
// Every shot is staged through the game's own objects — camera, wanted
// level, mission, vehicles, police, heli — then frozen (dt = 0), so the
// headless capture sees exactly what a player would see mid-game.
// Round-14 fixes applied here: the cover sedan is LARGE and fully in frame,
// and the mission skiff reads as a boat on open water (no road beneath it).
import THREE from 'three';
import { LIGHTHOUSE, PLAZA, MARINA } from './config.js';

function wakeTrail(scene) {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const w = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6 - i * 0.18, 3.2),
      new THREE.MeshBasicMaterial({ color: 0xdfe9ee, transparent: true, opacity: 0.55 - i * 0.07, depthWrite: false })
    );
    w.rotation.x = -Math.PI / 2;
    w.position.set(0, -0.2, -3.5 - i * 3.2);
    g.add(w);
  }
  scene.add(g);
  return g;
}

// ctx: { scene, camera, player, drivers, police, missions, hudState, traffic, peds }
export function stageShot(ctx, name) {
  const { scene, camera, player, drivers, police, missions } = ctx;
  const s = ctx.hudState;
  let camPos, camTarget;

  if (name === 'chase') {
    // Storm-fog chase on the coast road: sedan LARGE, fully in frame.
    const d = drivers.sedan;
    d.x = -120; d.z = -40; d.heading = -Math.PI / 2; d.speed = 32;
    d.vehicle.position.set(d.x, 0, d.z);
    d.vehicle.rotation.y = d.heading;
    player.onFoot = false; player.vehicle = d;
    player.x = d.x; player.z = d.z; player.heading = d.heading;
    // Two interceptors on the sedan's tail, visible just behind it.
    police.cars[0].x = -134; police.cars[0].z = -28; police.cars[0].heading = -Math.PI / 2;
    police.cars[1].x = -100; police.cars[1].z = -52; police.cars[1].heading = -Math.PI / 2;
    for (const c of police.cars) { c.vehicle.position.set(c.x, 0, c.z); c.vehicle.rotation.y = c.heading; }
    // Helicopter overhead with its spotlight cone in the mist.
    police.heli.visible = true;
    police.heli.position.set(-132, 14, -28);
    police.heli.rotation.y = 0.4;
    s.wanted = 4;
    s.objective = 'Reach the lighthouse point';
    s.timer = 0;
    s.speed = 32;
    s.stateLabel = 'W · DRIVING';
    // Traffic car ahead on the coast road, a ped on the sidewalk.
    ctx.traffic[0].vehicle.position.set(-146, 0, -8);
    ctx.peds[0].group.position.set(-136, 0, -58);
    ctx.peds[1].group.position.set(-138, 0, -20);
    // Camera close and low behind the sedan so it fills the frame.
    camPos = [-110, 3.5, -48];
    camTarget = [-124, 1, -40];
  } else if (name === 'play') {
    // On foot at Palm Plaza in the fog, beacon pillar over the red sedan.
    player.onFoot = true; player.vehicle = null;
    player.x = 2; player.z = 8; player.heading = Math.PI * 0.85;
    const d = drivers.sedan;
    d.x = 8; d.z = 10; d.heading = 0.4; d.speed = 0;
    d.vehicle.position.set(d.x, 0, d.z);
    d.vehicle.rotation.y = d.heading;
    police.heli.visible = false;
    s.wanted = 0;
    s.objective = 'Steal a car';
    s.timer = 0;
    s.speed = 0;
    s.stateLabel = 'E · ON FOOT';
    ctx.peds[2].group.position.set(-6, 0, -8);
    ctx.peds[3].group.position.set(10, 0, -6);
    camPos = [16, 5, 20];
    camTarget = [2, 1.4, 4];
  } else if (name === 'drive') {
    // Orange pickup up the foggy coast road, lighthouse beam to the left.
    const d = drivers.pickup;
    d.x = -142; d.z = 44; d.heading = Math.PI; d.speed = 29;
    d.vehicle.position.set(d.x, 0, d.z);
    d.vehicle.rotation.y = d.heading;
    player.onFoot = false; player.vehicle = d;
    player.x = d.x; player.z = d.z; player.heading = d.heading;
    police.heli.visible = false;
    ctx.traffic[1].vehicle.position.set(-142, 0, 8);
    ctx.traffic[1].vehicle.rotation.y = Math.PI;
    s.wanted = 0;
    s.objective = 'Pick up the fare at Palm Plaza — 90s';
    s.timer = 90;
    s.speed = 29;
    s.stateLabel = 'W · DRIVING';
    // Camera close behind the pickup so it fills the frame.
    camPos = [-139, 4, 56];
    camTarget = [-143, 1.2, 36];
  } else if (name === 'mission') {
    // Skiff on OPEN WATER west of the coast — wake behind it, lighthouse
    // beam ahead, no road anywhere beneath it.
    const d = drivers.boat;
    d.x = -175; d.z = 46; d.heading = Math.PI; d.speed = 16;
    d.vehicle.position.set(d.x, -0.15, d.z);
    d.vehicle.rotation.y = d.heading;
    player.onFoot = false; player.vehicle = d;
    player.x = d.x; player.z = d.z; player.heading = d.heading;
    const wake = wakeTrail(scene);
    wake.position.set(d.x, 0, d.z);
    wake.rotation.y = d.heading;
    police.heli.visible = false;
    s.wanted = 2;
    s.objective = 'Reach the lighthouse point';
    s.timer = 0;
    s.speed = 16;
    s.stateLabel = 'W · DRIVING';
    camPos = [-167, 4.5, 58];
    camTarget = [-177, 0.5, 38];
  } else {
    camPos = [20, 14, 30];
    camTarget = [0, 1, 0];
  }

  camera.position.set(camPos[0], camPos[1], camPos[2]);
  camera.lookAt(camTarget[0], camTarget[1], camTarget[2]);
  // Keep the mission beacon ring on the current objective.
  missions.ring.position.set(missions.target.x, 0.1, missions.target.z);
  return { camPos, camTarget };
}
