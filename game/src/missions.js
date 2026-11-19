// missions.js — Solmar Bay story: Rico Vega, a driver fresh out of the
// east-side garages, taking jobs from Delgado, a fixer who pays in cash.
// v1 ships mission 1 (tutorial drive) plus the cash-pickup side activity;
// missions 2-5 are defined here so the arc is visible in the code.
(function (global) {
  'use strict';

  const MISSIONS = [
    {
      id: 1,
      name: 'First Wheels',
      giver: 'Delgado',
      brief: 'Delgado: "Rico, you need wheels. Take any car on the street and bring it to the yellow marker at the plaza. Don\'t scratch it — much."',
      objective: 'Steal a car and drive to the plaza marker',
      reward: 250,
      kind: 'drive-to',
    },
    {
      id: 2,
      name: 'The Pickup',
      giver: 'Delgado',
      brief: 'Delgado: "Pick up the package at the north pier and lose the cops. Two stars, minimum — make it look good."',
      objective: 'Collect the package, then escape the police',
      reward: 500,
      kind: 'pickup-escape',
    },
    {
      id: 3,
      name: 'Hot Delivery',
      giver: 'Delgado',
      brief: 'Delgado: "A buyer waits at the beach house. Ninety seconds, Rico. The clock is already running."',
      objective: 'Deliver the package across the city in 90 seconds',
      reward: 750,
      kind: 'timed',
    },
    {
      id: 4,
      name: 'The Getaway',
      giver: 'Delgado',
      brief: 'Delgado: "The job went loud. Three stars and roadblocks on every avenue. Get to the safehouse — alive."',
      objective: 'Reach the safehouse with 3 wanted stars',
      reward: 1000,
      kind: 'getaway',
    },
    {
      id: 5,
      name: 'King of Solmar',
      giver: 'Delgado',
      brief: 'Delgado: "One last chase, Rico. Outrun the whole department, then face the captain at the plaza. This is how legends are made."',
      objective: 'Survive the finale chase and reach the plaza',
      reward: 2000,
      kind: 'finale',
    },
  ];

  function makeMissionState(city) {
    return {
      current: 1, // mission number in progress (1-based)
      best: 0, // highest mission completed
      active: false,
      done: false,
      failed: false,
      rewardPaid: false, // the $250 is paid once, on the completing frame
      timer: 0,
      marker: { x: city.plaza.x, z: city.plaza.z },
      message: '',
      messageT: 0,
    };
  }

  function startMission(state, n, city) {
    const m = MISSIONS[n - 1];
    state.current = n;
    state.active = true;
    state.done = false;
    state.failed = false;
    state.rewardPaid = false;
    state.timer = m.kind === 'timed' ? 90 : 0;
    state.message = m.brief;
    state.messageT = 8;
    // Mission 1's marker is the plaza; later missions reuse it until v2.
    state.marker = { x: city.plaza.x, z: city.plaza.z };
    return m;
  }

  // Mission 1: reach the plaza marker while driving any car. The radius
  // is 9 m because the fountain in the middle of the plaza physically
  // stops a car about 7 m out — the marker must be reachable, not exact.
  function updateMission1(state, player, dt) {
    if (!state.active || state.done || state.failed) return state.done ? 'done' : state.failed ? 'failed' : 'active';
    if (!player.inCar) return 'active';
    const dx = state.marker.x - player.inCar.x;
    const dz = state.marker.z - player.inCar.z;
    if (Math.sqrt(dx * dx + dz * dz) < 9) {
      state.done = true;
      state.active = false;
      state.message = 'Mission complete! Delgado paid you $250. The city is yours, Rico.';
      state.messageT = 6;
      return 'done';
    }
    return 'active';
  }

  // Cash pickups: small floating bundles scattered around the city.
  function makePickups(scene, rng, city, count) {
    const pickups = [];
    const geo = new THREE.BoxGeometry(0.9, 0.35, 0.6);
    const mat = new THREE.MeshLambertMaterial({ color: 0x2e8b57 });
    const bandMat = new THREE.MeshBasicMaterial({ color: 0xf2d05a });
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const bundle = new THREE.Mesh(geo, mat);
      bundle.castShadow = true;
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.12, 0.62), bandMat);
      g.add(bundle);
      g.add(band);
      // Park each pickup on a sidewalk, never inside a building.
      let x = 0;
      let z = 0;
      for (let tries = 0; tries < 20; tries++) {
        const road = rng.pick(city.roads);
        const along = rng.range(-city.half + 20, city.half - 20);
        const side = rng.chance(0.5) ? 1 : -1;
        if (rng.chance(0.5)) {
          x = along;
          z = road + side * 7.5;
        } else {
          x = road + side * 7.5;
          z = along;
        }
        let inside = false;
        for (const b of city.colliders) {
          if (x > b.minX - 1 && x < b.maxX + 1 && z > b.minZ - 1 && z < b.maxZ + 1) inside = true;
        }
        if (!inside) break;
      }
      g.position.set(x, 1.0, z);
      scene.add(g);
      pickups.push({ mesh: g, x: x, z: z, taken: false, phase: rng.range(0, 6) });
    }
    return pickups;
  }

  function updatePickups(pickups, playerX, playerZ, dt, onCollect) {
    for (const p of pickups) {
      if (p.taken) continue;
      p.phase += dt * 2;
      p.mesh.position.y = 1.0 + Math.sin(p.phase) * 0.15;
      p.mesh.rotation.y += dt * 1.2;
      const dx = p.x - playerX;
      const dz = p.z - playerZ;
      if (dx * dx + dz * dz < 3.2) {
        p.taken = true;
        p.mesh.visible = false;
        onCollect(50);
      }
    }
  }

  // The waypoint beacon: a tall yellow column of light plus a floating
  // diamond, so the player can see the objective from across the city.
  function makeBeacon(scene) {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 90, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xf2d05a, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
    );
    beam.position.y = 45;
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.6),
      new THREE.MeshBasicMaterial({ color: 0xf2d05a })
    );
    diamond.position.y = 8;
    g.add(beam);
    g.add(diamond);
    g.userData.diamond = diamond;
    scene.add(g);
    return g;
  }

  function updateBeacon(beacon, x, z, t) {
    beacon.position.set(x, 0, z);
    beacon.userData.diamond.position.y = 8 + Math.sin(t * 2) * 0.8;
    beacon.userData.diamond.rotation.y = t * 1.5;
  }

  global.VP = global.VP || {};
  global.VP.MISSIONS = MISSIONS;
  global.VP.makeMissionState = makeMissionState;
  global.VP.startMission = startMission;
  global.VP.updateMission1 = updateMission1;
  global.VP.makePickups = makePickups;
  global.VP.updatePickups = updatePickups;
  global.VP.makeBeacon = makeBeacon;
  global.VP.updateBeacon = updateBeacon;
})(typeof window !== 'undefined' ? window : globalThis);
