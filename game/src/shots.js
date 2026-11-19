// shots.js — Solmar Bay screenshot staging: ?shot=start|play|chase|mission
// (plus &seed=N) puts the game into a fixed, reproducible scene so the
// four screenshots are real renders of the game's own code: a hero
// boulevard cover, on-foot plaza life, a police chase, and a mission run.
// The staging runs after the world is built and before the first frame.
(function (global) {
  'use strict';

  // Put the player in a car at (x, z) facing heading, driving at speed.
  function putInCar(world, type, color, x, z, heading, speed) {
    const car = VP.makeCar(type, color, x, z, heading);
    car.speed = speed;
    world.scene.add(car.mesh);
    world.playerCars.push(car);
    world.player.inCar = car;
    world.player.mesh.visible = false;
    world.player.x = x;
    world.player.z = z;
    world.player.heading = heading;
    return car;
  }

  function putOnFoot(world, x, z, heading) {
    world.player.x = x;
    world.player.z = z;
    world.player.heading = heading;
    world.player.mesh.position.set(x, 0, z);
    world.player.mesh.rotation.y = heading;
    world.player.mesh.visible = true;
    world.player.inCar = null;
  }

  function stageShot(world, name) {
    const city = world.city;
    const plaza = city.plaza;
    world.state = 'playing';
    world.shotMode = true;
    world.camYaw = 0;
    world.camPitch = 0.32;
    if (name === 'start') {
      // Cover: a red coupe on the sun-soaked main avenue, downtown towers
      // and palms ahead, the plaza beacon glowing to the left. The car
      // sits close to the camera so it reads as the hero of the frame.
      putInCar(world, 'coupe', 0xc0392b, -52, 3, Math.PI / 2, 0);
      world.cameraMode = 'fixed';
      world.camFixed = {
        pos: [-70, 9, 6],
        look: [-20, 2, -8],
      };
      world.mission.active = true;
      world.message = 'Delgado: "Take any car and bring it to the plaza marker."';
      world.messageT = 10;
    } else if (name === 'play') {
      // On foot in the plaza: pedestrians strolling, traffic passing on
      // the avenue, the mission marker glowing in the distance.
      putOnFoot(world, plaza.x + 8, plaza.z + 10, Math.PI * 0.7);
      // A few extra pedestrians near the plaza for a lively frame.
      for (let i = 0; i < 4; i++) {
        const ped = VP.makePedestrian(world.scene, world.rng, city);
        ped.x = plaza.x + world.rng.range(-14, 14);
        ped.z = plaza.z + world.rng.range(-14, 14);
        ped.mesh.position.set(ped.x, 0, ped.z);
        world.pedestrians.push(ped);
      }
      world.cameraMode = 'fixed';
      world.camFixed = {
        pos: [plaza.x + 22, 6, plaza.z + 26],
        look: [plaza.x - 8, 2, plaza.z - 14],
      };
      world.mission.active = true;
      world.message = 'Objective: steal a car and drive to the plaza marker';
      world.messageT = 10;
    } else if (name === 'chase') {
      // Police chase: three wanted stars, two police cars right behind
      // the player's coupe, sirens flashing, avenue traffic ahead.
      // Both cruisers sit in the player's lane a few metres back, so the
      // chase camera (16 m behind) sees them framing the player's car.
      putInCar(world, 'coupe', 0x2e6db4, -30, 3, Math.PI / 2, 22);
      VP.addHeat(world.wanted, 70);
      const p1 = VP.makePoliceCar(world.scene, world.rng, city, -37, 1.5);
      p1.heading = Math.PI / 2;
      p1.speed = 21;
      const p2 = VP.makePoliceCar(world.scene, world.rng, city, -40, 5);
      p2.heading = Math.PI / 2;
      p2.speed = 20;
      world.police.push(p1);
      world.police.push(p2);
      world.cameraMode = 'follow';
      world.camYaw = Math.PI / 2;
      world.camPitch = 0.3;
      world.camDist = 16;
      world.autoDrive = true; // keep the chase rolling for the screenshot
      world.mission.active = true;
      world.message = 'WANTED — 3 stars! Lose the cops!';
      world.messageT = 10;
    } else if (name === 'mission') {
      // Mission in progress: the player's sedan on the plaza avenue,
      // nearly at the waypoint — beacon column and fountain ahead,
      // downtown towers beyond. A fixed three-quarter camera frames the
      // car, the marker and the plaza in one shot.
      putInCar(world, 'sedan', 0x27ae60, -8, -27, -Math.PI / 2, 8);
      world.cameraMode = 'fixed';
      world.camFixed = {
        pos: [16, 7, -38],
        look: [-20, 3, -22],
      };
      world.autoDrive = true; // creep toward the marker for the screenshot
      world.mission.active = true;
      world.message = 'Objective: drive to the plaza marker';
      world.messageT = 10;
    } else {
      // Unknown shot name: just start playing at the plaza.
      putOnFoot(world, plaza.x + 8, plaza.z + 10, 0);
      world.cameraMode = 'follow';
    }
    // The beacon always marks the active mission target.
    VP.updateBeacon(world.beacon, world.mission.marker.x, world.mission.marker.z, 0);
  }

  global.VP = global.VP || {};
  global.VP.stageShot = stageShot;
})(typeof window !== 'undefined' ? window : globalThis);
