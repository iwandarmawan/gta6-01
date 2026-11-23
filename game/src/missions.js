// Missions: three jobs in story order, each with timed steps,
// a 3D beacon over the current target, package pickups, and a
// cash reward. Fail by timeout; retry from Rico's Garage.

import { MISSIONS, PLACES, TUNING } from './config.js';

const THREE = window.THREE;

function targetPosOf(step) {
  if (step.target === 'garage') return PLACES.garage;
  if (step.target === 'hotel') return PLACES.hotel;
  if (step.target === 'hotelFront') return PLACES.hotelFront;
  if (step.target === 'marina') return PLACES.marina;
  if (step.target === 'dock') return PLACES.dock;
  if (step.target === 'buoy') return PLACES.buoy;
  if (step.target.startsWith('packages.')) {
    return PLACES.packages[Number(step.target.split('.')[1])];
  }
  return PLACES.plaza;
}

export function createMissions(scene, game) {
  const missions = {
    index: 0,
    active: null,
    status: 'idle',
    bobT: 0,
  };

  // Floating beacon over the current objective.
  const beacon = new THREE.Group();
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffd94a, transparent: true, opacity: 0.22,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 34, 10, 1, true), beamMat);
  beam.position.y = 17;
  beacon.add(beam);
  const diamondMat = new THREE.MeshBasicMaterial({ color: 0xffd94a });
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(1.3), diamondMat);
  diamond.position.y = 7;
  beacon.add(diamond);
  beacon.visible = false;
  scene.add(beacon);

  // The three parcels for Package Run.
  const packageMeshes = PLACES.packages.map((p) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.8, 1.1),
      new THREE.MeshLambertMaterial({ color: 0xff8c1a, emissive: 0xcc6600 }),
    );
    mesh.material.emissiveIntensity = 0.7;
    mesh.position.set(p.x, 0.5, p.z);
    mesh.visible = false;
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
  });

  function currentStep() {
    if (!missions.active) return null;
    return missions.active.def.steps[missions.active.stepIndex];
  }

  function showPackages(show) {
    const inRun = missions.active && missions.active.def.id === 'package-run';
    packageMeshes.forEach((m, i) => {
      m.visible = show && inRun && i >= missions.active.stepIndex && missions.active.stepIndex < 3;
    });
  }

  missions.currentTarget = function currentTarget() {
    const step = currentStep();
    if (!step) return null;
    return targetPosOf(step);
  };

  missions.startNext = function startNext() {
    if (missions.index >= MISSIONS.length) return false;
    const def = MISSIONS[missions.index];
    missions.active = { def, stepIndex: 0, timeLeft: def.timeLimit };
    missions.status = 'active';
    beacon.visible = true;
    showPackages(true);
    game.hud.toast(def.name + ' — ' + def.briefing, 5);
    game.audio.beep(990, 0.2);
    return true;
  };

  missions.fail = function fail(reason) {
    if (!missions.active) return;
    game.hud.toast('Mission failed: ' + reason + '. Head back to Rico\'s Garage to retry.', 4);
    game.audio.beep(220, 0.3);
    missions.active = null;
    missions.status = 'failed';
    beacon.visible = false;
    showPackages(false);
  };

  missions.complete = function complete() {
    const def = missions.active.def;
    game.cash += def.reward;
    game.save.missionsDone = missions.index + 1;
    game.saveGame();
    game.hud.toast(def.name + ' complete! +$' + def.reward, 4);
    game.audio.jingle();
    missions.index += 1;
    missions.active = null;
    beacon.visible = false;
    showPackages(false);
    if (missions.index >= MISSIONS.length) {
      missions.status = 'story-done';
      game.cash += 500;
      game.save.storyComplete = true;
      game.saveGame();
      game.hud.toast('Story complete! Rico pays a $500 bonus. Solmar Bay is yours.', 6);
      game.audio.jingle();
    } else {
      missions.status = 'idle';
    }
  };

  missions.update = function update(dt) {
    missions.bobT += dt;
    if (beacon.visible) {
      diamond.position.y = 7 + Math.sin(missions.bobT * 2.2) * 0.8;
      diamond.rotation.y += dt * 1.5;
      beamMat.opacity = 0.16 + Math.sin(missions.bobT * 2.2) * 0.07;
    }
    if (!missions.active) return;
    const step = currentStep();
    const target = targetPosOf(step);
    beacon.position.set(target.x, 0, target.z);
    missions.active.timeLeft -= dt;
    if (missions.active.timeLeft <= 0) {
      missions.fail('Time ran out');
      return;
    }
    const p = game.player;
    const d = Math.hypot(p.pos.x - target.x, p.pos.z - target.z);
    if (step.kind === 'board') {
      if (p.vehicle === 'boat') {
        missions.advanceStep();
      }
      return;
    }
    // Reach: parcels are small (4m); a building's front door is 14m
    // from its centre, so a goto step completes from the street.
    const reach = step.kind === 'collect' ? 4 : 14;
    if (d > reach) return;
    if (step.kind === 'collect') {
      game.police.addHeat(TUNING.heatPerPackage);
      game.audio.beep(1200, 0.15);
      game.hud.toast('Package secured. The law noticed.', 2.5);
    }
    missions.advanceStep();
  };

  missions.advanceStep = function advanceStep() {
    missions.active.stepIndex += 1;
    if (missions.active.stepIndex >= missions.active.def.steps.length) {
      missions.complete();
      return;
    }
    const step = currentStep();
    game.hud.toast('Next: ' + step.label, 3);
    game.audio.beep(990, 0.15);
    showPackages(true);
  };

  // Distance to the current objective, for the HUD.
  missions.targetDistance = function targetDistance() {
    const target = missions.currentTarget();
    if (!target) return 0;
    const p = game.player;
    return Math.hypot(p.pos.x - target.x, p.pos.z - target.z);
  };

  return missions;
}
