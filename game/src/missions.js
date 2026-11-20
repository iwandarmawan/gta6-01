// missions.js — Solmar Bay story: Rico Vega, a driver fresh out of the
// east-side garages, taking jobs from Delgado, a fixer who pays in cash.
// v2 plays missions 1-4: a tutorial drive, a getaway, a timed delivery and
// an ambush at the park. Mission 5 waits for v3.
(function (global) {
  'use strict';

  const MISSIONS = [
    {
      id: 1,
      name: 'First Wheels',
      giver: 'Delgado',
      brief: 'Delgado: "Rico, you need wheels. Take any car on the street and bring it to the yellow marker at the plaza. Don\'t scratch it — much."',
      objective: 'Steal a car and drive to the plaza marker',
      doneText: 'Mission complete! Delgado paid you $250. The city is yours, Rico.',
      reward: 250,
      kind: 'drive-to',
    },
    {
      id: 2,
      name: 'The Getaway',
      giver: 'Delgado',
      brief: 'Delgado: "Pick up the package at the north docks, then lose the cops. Two stars, minimum — make it look good, Rico."',
      objective: 'Collect the package at the docks, then reach the safehouse',
      doneText: 'Mission complete! Delgado paid you $300. Clean getaway — the package is safe.',
      reward: 300,
      kind: 'pickup-escape',
    },
    {
      id: 3,
      name: 'Clockwork',
      giver: 'Delgado',
      brief: 'Delgado: "A buyer waits at the beach house. Ninety seconds, Rico. The clock is already running."',
      objective: 'Deliver the package to the beach house in 90 seconds',
      doneText: 'Mission complete! Delgado paid you $400. Right on time — the buyer is happy.',
      reward: 400,
      kind: 'timed',
    },
    {
      id: 4,
      name: 'The Informant',
      giver: 'Delgado',
      brief: 'Delgado: "Meet my informant at the park — on foot, quiet. And take this pistol. Things get loud from here."',
      objective: 'Meet the informant at the park, survive the ambush, reach the safehouse',
      doneText: 'Mission complete! Delgado paid you $500. The informant talked. Now we know who set us up.',
      reward: 500,
      kind: 'ambush-escape',
    },
  ];

  // Fixed story spots, picked from the city grid so they are always on a
  // road, on the sand, or in the park — never inside a building.
  function storySpots(city) {
    return {
      docks: { x: 192, z: -192 }, // north-east corner, by the beach road
      beachHouse: { x: 252, z: 96 }, // on the sand, east edge
      safehouse: { x: -192, z: 144 }, // south-west intersection
      informant: { x: city.park.x, z: city.park.z }, // the park lawn
      roadblocks: [
        { x: -192, z: 96, heading: 0 }, // the avenue into the safehouse
        { x: -144, z: 144, heading: Math.PI / 2 }, // the cross street
      ],
    };
  }

  function makeMissionState(city) {
    return {
      current: 1,
      best: 0,
      active: false,
      done: false,
      failed: false,
      rewardPaid: false,
      timer: 0,
      timerMax: 0,
      stage: 'go', // pickup-escape: pickup -> escape; ambush: tail -> ambush -> escape
      marker: { x: city.plaza.x, z: city.plaza.z },
      message: '',
      messageT: 0,
      nextT: 0, // counts down to the next mission after a win
      retryT: 0, // counts down to a retry after a fail
      spots: storySpots(city),
      thugsSpawned: false,
    };
  }

  function startMission(state, n, city) {
    const m = MISSIONS[n - 1];
    state.current = n;
    state.active = true;
    state.done = false;
    state.failed = false;
    state.rewardPaid = false;
    state.nextT = 0;
    state.retryT = 0;
    state.thugsSpawned = false;
    state.timer = m.kind === 'timed' ? 90 : 0;
    state.timerMax = state.timer;
    state.stage = 'go';
    if (m.kind === 'pickup-escape') {
      state.stage = 'pickup';
      state.marker = { x: state.spots.docks.x, z: state.spots.docks.z };
    } else if (m.kind === 'ambush-escape') {
      state.stage = 'tail';
      state.marker = { x: state.spots.informant.x, z: state.spots.informant.z };
    } else if (m.kind === 'timed') {
      state.marker = { x: state.spots.beachHouse.x, z: state.spots.beachHouse.z };
    } else {
      state.marker = { x: city.plaza.x, z: city.plaza.z };
    }
    state.message = m.brief;
    state.messageT = 8;
    return m;
  }

  function finishMission(state, world) {
    const m = MISSIONS[state.current - 1];
    state.done = true;
    state.active = false;
    state.message = m.doneText;
    state.messageT = 6;
    state.nextT = 4; // four seconds to enjoy the win, then the next job
    return 'done';
  }

  function failMission(state, world, why) {
    state.failed = true;
    state.active = false;
    state.message = why;
    state.messageT = 5;
    state.retryT = 3.5; // Delgado always gives Rico another shot
    return 'failed';
  }

  function dist2(ax, az, bx, bz) {
    const dx = ax - bx;
    const dz = az - bz;
    return dx * dx + dz * dz;
  }

  // One update for every mission kind. Returns 'done', 'failed', 'waiting'
  // (between missions) or 'active'. The world carries the player, the
  // wanted level, the thugs and the roadblocks, so the mission logic can
  // reach everything it needs.
  function updateMission(state, world, dt) {
    const m = MISSIONS[state.current - 1];
    const player = world.player;
    if (!state.active) {
      if (state.done && state.nextT > 0) {
        state.nextT -= dt;
        if (state.nextT <= 0) {
          if (state.current < 4) {
            startMission(state, state.current + 1, world.city);
            return 'active';
          }
          state.message = 'Delgado: "That\'s the whole arc, Rico. Solmar Bay is yours now."';
          state.messageT = 8;
          state.nextT = 0;
        }
        return 'waiting';
      }
      if (state.failed && state.retryT > 0) {
        state.retryT -= dt;
        if (state.retryT <= 0) {
          startMission(state, state.current, world.city);
          return 'active';
        }
        return 'waiting';
      }
      return state.done ? 'done' : state.failed ? 'failed' : 'active';
    }

    if (m.kind === 'timed') {
      state.timer -= dt;
      if (state.timer <= 0) {
        state.timer = 0;
        if (world.audio) VP.failSting(world.audio);
        return failMission(state, world, 'Too slow! Delgado gives you another shot — the clock restarts.');
      }
      if (dist2(player.x, player.z, state.marker.x, state.marker.z) < 81) {
        return finishMission(state, world);
      }
      return 'active';
    }

    if (m.kind === 'pickup-escape') {
      if (state.stage === 'pickup') {
        if (dist2(player.x, player.z, state.marker.x, state.marker.z) < 49) {
          state.stage = 'escape';
          state.marker = { x: state.spots.safehouse.x, z: state.spots.safehouse.z };
          state.message = 'Package grabbed! Two stars on you — get to the safehouse!';
          state.messageT = 5;
          if (world.wanted.stars < 2) VP.addHeat(world.wanted, 45);
          world.lastHeatT = world.time;
        }
        return 'active';
      }
      if (dist2(player.x, player.z, state.marker.x, state.marker.z) < 81) {
        return finishMission(state, world);
      }
      return 'active';
    }

    if (m.kind === 'ambush-escape') {
      if (state.stage === 'tail') {
        // On foot only: the informant will not talk to a car window.
        if (!player.inCar && dist2(player.x, player.z, state.marker.x, state.marker.z) < 16) {
          state.stage = 'ambush';
          state.message = 'Ambush! Three of them — take them down, Rico!';
          state.messageT = 5;
          if (world.combat && world.combat.weapon !== 'pistol') VP.grantPistol(world.combat, player);
          if (!state.thugsSpawned) {
            state.thugsSpawned = true;
            const spots = [
              { x: state.marker.x + 8, z: state.marker.z - 6 },
              { x: state.marker.x - 7, z: state.marker.z + 8 },
              { x: state.marker.x + 2, z: state.marker.z + 11 },
            ];
            for (const s of spots) world.thugs.push(VP.makeThug(world.scene, s.x, s.z));
          }
        }
        return 'active';
      }
      if (state.stage === 'ambush') {
        if (VP.thugsAlive(world.thugs) === 0) {
          state.stage = 'escape';
          state.marker = { x: state.spots.safehouse.x, z: state.spots.safehouse.z };
          state.message = 'All three down! Three stars and roadblocks — run for the safehouse!';
          state.messageT = 5;
          // The escape runs at exactly 3 stars, whatever the firefight
          // pushed the heat to: the law is on you, but not the whole city.
          world.wanted.heat = 70;
          world.wanted.stars = 3;
          world.lastHeatT = world.time;
          world.roadblocksOn = true;
        }
        return 'active';
      }
      if (dist2(player.x, player.z, state.marker.x, state.marker.z) < 81) {
        world.roadblocksOn = false;
        return finishMission(state, world);
      }
      return 'active';
    }

    // drive-to (mission 1): reach the plaza marker while driving.
    if (!player.inCar) return 'active';
    if (dist2(player.inCar.x, player.inCar.z, state.marker.x, state.marker.z) < 81) {
      return finishMission(state, world);
    }
    return 'active';
  }

  // Backwards-compatible name for mission 1's old updater.
  function updateMission1(state, player, dt) {
    if (!state.active || state.done || state.failed) return state.done ? 'done' : state.failed ? 'failed' : 'active';
    if (!player.inCar) return 'active';
    if (dist2(player.inCar.x, player.inCar.z, state.marker.x, state.marker.z) < 81) {
      state.done = true;
      state.active = false;
      state.message = MISSIONS[0].doneText;
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
  global.VP.updateMission = updateMission;
  global.VP.updateMission1 = updateMission1;
  global.VP.makePickups = makePickups;
  global.VP.updatePickups = updatePickups;
  global.VP.makeBeacon = makeBeacon;
  global.VP.updateBeacon = updateBeacon;
})(typeof window !== 'undefined' ? window : globalThis);
