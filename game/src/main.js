// main.js — Solmar Bay boot and game loop.
// Builds the world, wires input, runs the states (menu, playing, paused,
// busted, wasted) and the third-person / chase cameras. The game reads
// ?seed=N for its deterministic city and ?shot=<name> for screenshot poses.
(function (global) {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const SEED = parseInt(params.get('seed') || '1', 10) || 1;
  const SHOT = params.get('shot') || null;
  const SAVE_KEY = 'solmarbay.save.v1';

  // --- renderer, scene, camera --------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

  // --- world ---------------------------------------------------------------
  const city = VP.buildCity(scene, SEED);
  const rng = VP.makeRng(SEED + 101);
  const world = {
    scene: scene,
    city: city,
    rng: rng,
    state: 'menu',
    shotMode: false,
    cameraMode: 'orbit',
    camYaw: 0.6,
    camPitch: 0.35,
    camDist: 11,
    camFixed: null,
    camDragUntil: 0,
    cash: 120,
    health: 100,
    clockMinutes: 600, // 10:00 in the morning
    message: '',
    messageT: 0,
    steals: 0,
    lastHeatT: -100, // last time a crime raised the wanted heat
    lastPedHitT: -10, // last time a pedestrian was hit (rate-limit)
    time: 0,
  };

  // Parked cars the player can steal, lined up along the roads.
  const playerCars = [];
  for (let i = 0; i < 10; i++) {
    const horizontal = rng.chance(0.5);
    const road = rng.pick(city.roads);
    const along = rng.range(-city.half + 30, city.half - 30);
    const lane = rng.chance(0.5) ? 8.5 : -8.5; // parked at the kerb
    const type = rng.pick(['sedan', 'sedan', 'coupe', 'van', 'taxi']);
    const color = type === 'taxi' ? 0xf2c200 : rng.pick(VP.PAINTS);
    const x = horizontal ? along : road + lane;
    const z = horizontal ? road + lane : along;
    const heading = horizontal ? (lane > 0 ? Math.PI / 2 : -Math.PI / 2) : (lane > 0 ? 0 : Math.PI);
    const car = VP.makeCar(type, color, x, z, heading);
    scene.add(car.mesh);
    playerCars.push(car);
  }
  world.playerCars = playerCars;

  // Traffic and pedestrians.
  const traffic = [];
  for (let i = 0; i < 14; i++) traffic.push(VP.makeTrafficCar(scene, rng, city));
  world.traffic = traffic;
  const pedestrians = [];
  for (let i = 0; i < 24; i++) pedestrians.push(VP.makePedestrian(scene, rng, city));
  world.pedestrians = pedestrians;

  // The player, the mission, the wanted level, the pickups.
  const player = VP.makePlayer(city.plaza.x + 8, city.plaza.z + 10);
  scene.add(player.mesh);
  world.player = player;
  const mission = VP.makeMissionState(city);
  world.mission = mission;
  const wanted = VP.makeWanted();
  world.wanted = wanted;
  const police = [];
  world.police = police;
  const pickups = VP.makePickups(scene, rng, city, 12);
  world.pickups = pickups;
  const beacon = VP.makeBeacon(scene);
  world.beacon = beacon;
  const hud = VP.makeHud();
  const audio = VP.makeAudio();
  const smokeAcc = { t: 0, puffs: [] };

  // Load a save, if one exists.
  let save = null;
  try {
    save = JSON.parse(window.localStorage.getItem(SAVE_KEY) || 'null');
  } catch (err) {
    save = null;
  }
  if (save && typeof save.cash === 'number') world.cash = save.cash;
  if (save && typeof save.best === 'number') mission.best = save.best;
  if (save && save.muted) VP.setMuted(audio, true);

  function saveGame() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: Math.floor(world.cash),
        best: mission.best,
        muted: audio.muted,
      }));
    } catch (err) {
      // Storage full or blocked: the game keeps playing without a save.
    }
  }

  // --- input ----------------------------------------------------------------
  const keys = {};
  let dragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space') e.preventDefault();
    keys[e.code] = true;
    if (e.code === 'KeyM') {
      VP.setMuted(audio, !audio.muted);
      showMessage(audio.muted ? 'Sound off' : 'Sound on', 2);
    }
    if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    if (e.code === 'KeyR' && (world.state === 'busted' || world.state === 'wasted')) restart();
    if (e.code === 'KeyE' && world.state === 'playing') toggleEnterExit();
  });
  window.addEventListener('keyup', function (e) {
    keys[e.code] = false;
  });
  renderer.domElement.addEventListener('mousedown', function (e) {
    dragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    VP.startAudio(audio);
  });
  window.addEventListener('mouseup', function () {
    dragging = false;
  });
  window.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    world.camYaw -= (e.clientX - lastMouseX) * 0.005;
    world.camPitch += (e.clientY - lastMouseY) * 0.004;
    world.camPitch = Math.max(0.06, Math.min(1.1, world.camPitch));
    world.camDragUntil = world.time + 3;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });
  renderer.domElement.addEventListener('wheel', function (e) {
    world.camDist = Math.max(6, Math.min(18, world.camDist + e.deltaY * 0.01));
  });
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- menus ------------------------------------------------------------------
  const overlays = {
    menu: document.getElementById('menu'),
    pause: document.getElementById('pause'),
    busted: document.getElementById('busted'),
    wasted: document.getElementById('wasted'),
  };
  function showOverlay(name) {
    for (const key in overlays) {
      if (overlays[key]) overlays[key].style.display = key === name ? 'flex' : 'none';
    }
    // The HUD stays out of the way behind the title screen.
    document.body.classList.toggle('in-menu', name === 'menu');
  }
  function showMessage(text, seconds) {
    world.message = text;
    world.messageT = seconds || 5;
  }
  function startGame() {
    VP.startAudio(audio);
    world.state = 'playing';
    world.cameraMode = 'follow';
    showOverlay(null);
    if (!mission.active && !mission.done) {
      VP.startMission(mission, 1, city);
      showMessage(mission.message, 8);
    }
    saveGame();
  }
  function togglePause() {
    if (world.state === 'playing') {
      world.state = 'paused';
      showOverlay('pause');
    } else if (world.state === 'paused') {
      world.state = 'playing';
      showOverlay(null);
    }
  }
  function restart() {
    // Back on foot at the plaza, wanted cleared, health restored, a fine paid.
    if (player.inCar) {
      player.inCar.speed = 0;
      player.inCar = null;
    }
    player.x = city.plaza.x + 8;
    player.z = city.plaza.z + 10;
    player.y = 0;
    player.mesh.visible = true;
    player.mesh.position.set(player.x, 0, player.z);
    world.cash = Math.max(0, world.cash - (world.state === 'busted' ? 100 : 150));
    world.health = 100;
    wanted.heat = 0;
    wanted.stars = 0;
    wanted.bustedT = 0;
    for (const car of police) scene.remove(car.mesh);
    police.length = 0;
    mission.active = false;
    mission.done = false;
    mission.failed = false;
    world.state = 'playing';
    showOverlay(null);
    VP.startMission(mission, 1, city);
    showMessage(mission.message, 8);
    saveGame();
  }
  function endRun(kind) {
    world.state = kind; // 'busted' or 'wasted'
    showOverlay(kind);
    saveGame();
  }

  function toggleEnterExit() {
    if (player.inCar) {
      VP.exitCar(player, player.inCar);
      showMessage('You left the car.', 2);
      return;
    }
    const car = VP.nearestCar(player, playerCars, 3.6);
    if (!car) return;
    player.inCar = car;
    player.mesh.visible = false;
    world.steals++;
    // The first steal is the tutorial: free. Later ones draw the law.
    if (world.steals > 1) {
      VP.addHeat(wanted, 20);
      world.lastHeatT = world.time;
      showMessage('You stole a car! The police are on their way.', 4);
    } else {
      showMessage('Nice wheels. Drive to the yellow marker.', 4);
    }
  }

  document.getElementById('play-btn').addEventListener('click', startGame);
  const continueBtn = document.getElementById('continue-btn');
  if (continueBtn) {
    continueBtn.style.display = save ? 'inline-block' : 'none';
    continueBtn.addEventListener('click', startGame);
  }
  document.getElementById('resume-btn').addEventListener('click', togglePause);
  document.getElementById('restart-btn').addEventListener('click', restart);
  document.getElementById('busted-btn').addEventListener('click', restart);
  document.getElementById('wasted-btn').addEventListener('click', restart);

  // --- per-frame updates ------------------------------------------------------
  function step(dt) {
    world.time += dt;
    world.clockMinutes += dt * 0.5; // one game hour per two real minutes
    if (world.messageT > 0) {
      world.messageT -= dt;
      if (world.messageT <= 0) world.message = '';
    }

    const input = {
      forward: (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0),
      strafe: (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0),
      run: !!keys.ShiftLeft || !!keys.ShiftRight,
      jump: !!keys.Space,
      throttle: (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0),
      steer: (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0),
      handbrake: !!keys.Space,
    };
    // Screenshot poses drive themselves so the chase and mission frames
    // show the cars moving, not coasting to a stop.
    if (world.autoDrive) {
      input.throttle = 1;
      input.steer = 0;
      input.handbrake = false;
    }

    // Player: on foot or driving.
    let playerSpeed = 0;
    if (player.inCar) {
      const car = player.inCar;
      VP.driveCar(car, input, dt, city.colliders, city.bounds);
      player.x = car.x;
      player.z = car.z;
      player.heading = car.heading;
      playerSpeed = car.speed;
      VP.carSmoke(scene, car, dt, smokeAcc);
      // A wrecked car throws the driver out, hurt.
      if (car.damage >= 1) {
        car.damage = 0.9;
        car.speed = 0;
        VP.exitCar(player, car);
        world.health = Math.max(0, world.health - 25);
        showMessage('Your car is wrecked!', 4);
      }
    } else {
      VP.updatePlayer(player, input, world.camYaw, dt, city.colliders, city.bounds);
    }

    // Traffic and pedestrians keep the city alive. A crash threat is
    // worked out first, so nearby pedestrians flee from it this frame.
    for (const car of traffic) VP.updateTrafficCar(car, dt, rng, city, traffic.concat(playerCars));
    let threat = null;
    if (player.inCar && Math.abs(playerSpeed) > 8) {
      for (const ped of pedestrians) {
        const dx = ped.x - player.x;
        const dz = ped.z - player.z;
        if (dx * dx + dz * dz < 36) threat = { x: player.x, z: player.z };
      }
    }
    for (const ped of pedestrians) VP.updatePedestrian(ped, dt, rng, city, threat);

    // The player's car shoving a pedestrian is a crime — but one hit is
    // one crime, not one per frame, so it is rate-limited. Staged
    // screenshots never raise heat: the pose is the point, not the crime.
    if (threat && !world.shotMode && world.time - (world.lastPedHitT || -10) > 3) {
      VP.addHeat(wanted, 15);
      world.lastHeatT = world.time;
      world.lastPedHitT = world.time;
      showMessage('You hit a pedestrian!', 3);
    }

    // Car-to-car bumps: the player's car against traffic.
    if (player.inCar) {
      for (const other of traffic) {
        const dx = other.x - player.inCar.x;
        const dz = other.z - player.inCar.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        const minD = player.inCar.radius + other.radius;
        if (d < minD && d > 0.01) {
          const push = (minD - d) / 2;
          const nx = dx / d;
          const nz = dz / d;
          player.inCar.x -= nx * push;
          player.inCar.z -= nz * push;
          other.x += nx * push;
          other.z += nz * push;
          if (Math.abs(playerSpeed) > 10) {
            player.inCar.damage = Math.min(1, player.inCar.damage + 0.08);
            VP.addHeat(wanted, 8);
            world.lastHeatT = world.time;
          }
        }
      }
    }

    // Wanted level and police. The heat cools off only when the player
    // has not committed a crime for a while; a fresh crime resets the clock.
    const seen = world.time - (world.lastHeatT || -100) < 5;
    VP.updateWanted(wanted, dt, seen);
    VP.syncPolice(scene, police, wanted, rng, city, player.x, player.z);
    let nearestPolice = 999;
    for (const car of police) {
      const d = VP.updatePoliceCar(car, player.x, player.z, dt, city.colliders, city.bounds, rng);
      nearestPolice = Math.min(nearestPolice, d);
      // Police ramming the player's car damages it.
      if (player.inCar) {
        const dx = car.x - player.inCar.x;
        const dz = car.z - player.inCar.z;
        const dd = Math.sqrt(dx * dx + dz * dz);
        if (dd < player.inCar.radius + car.radius && dd > 0.01) {
          player.inCar.damage = Math.min(1, player.inCar.damage + 0.05);
          player.inCar.x -= (dx / dd) * 0.6;
          player.inCar.z -= (dz / dd) * 0.6;
        }
      }
    }
    if (VP.updateBusted(wanted, police, player.x, player.z, !!player.inCar, Math.abs(playerSpeed), dt)) {
      endRun('busted');
    }
    if (world.health <= 0) endRun('wasted');

    // Mission 1 and cash pickups. The reward is paid once: updateMission1
    // keeps returning 'done' after completion, so a flag guards the payout.
    const missionResult = VP.updateMission1(mission, player, dt);
    if (missionResult === 'done' && !mission.rewardPaid) {
      mission.rewardPaid = true;
      world.cash += 250;
      mission.best = Math.max(mission.best, 1);
      VP.sting(audio);
      showMessage(mission.message, 6);
      saveGame();
    }
    VP.updatePickups(pickups, player.x, player.z, dt, function (amount) {
      world.cash += amount;
      VP.blip(audio, 880, 0.1, 0.18);
      showMessage('+$' + amount + ' cash pickup', 2);
    });
    VP.updateBeacon(beacon, mission.marker.x, mission.marker.z, world.time);
    VP.updateSmoke(smokeAcc, dt);

    // Audio follows the car and the nearest siren.
    VP.setEngine(audio, player.inCar ? playerSpeed * 3.6 : 0, !!player.inCar);
    VP.setSiren(audio, nearestPolice < 45);

    // --- camera ------------------------------------------------------------
    const focusX = player.x;
    const focusZ = player.z;
    if (world.cameraMode === 'fixed' && world.camFixed) {
      camera.position.set(world.camFixed.pos[0], world.camFixed.pos[1], world.camFixed.pos[2]);
      camera.lookAt(world.camFixed.look[0], world.camFixed.look[1], world.camFixed.look[2]);
    } else {
      // Chase camera: behind the player (or the car), eased toward the
      // direction of travel unless the player dragged the view recently.
      const targetHeading = player.heading;
      if (world.time > world.camDragUntil) {
        let dh = targetHeading - world.camYaw;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        world.camYaw += dh * Math.min(1, dt * 1.2);
      }
      const dist = player.inCar ? world.camDist : 7;
      const height = player.inCar ? 3.6 + world.camPitch * 3 : 2.2 + world.camPitch * 3;
      const cx = focusX - Math.sin(world.camYaw) * dist;
      const cz = focusZ - Math.cos(world.camYaw) * dist;
      camera.position.x += (cx - camera.position.x) * Math.min(1, dt * 6);
      camera.position.y += (height - camera.position.y) * Math.min(1, dt * 6);
      camera.position.z += (cz - camera.position.z) * Math.min(1, dt * 6);
      camera.lookAt(focusX, player.inCar ? 1.4 : 1.6, focusZ);
    }

    // --- HUD ---------------------------------------------------------------
    VP.updateHud(hud, {
      cash: world.cash,
      health: world.health,
      wanted: wanted.stars,
      speedKmh: playerSpeed * 3.6,
      inCar: !!player.inCar,
      running: input.run,
      objective: mission.active ? VP.MISSIONS[mission.current - 1].objective : 'Free roam — explore Solmar Bay',
      clockMinutes: world.clockMinutes,
      message: world.message,
    });
    VP.drawMinimap(hud, {
      city: city,
      traffic: traffic,
      police: police,
      mission: mission,
      playerX: player.x,
      playerZ: player.z,
      playerHeading: player.heading,
    });
  }

  // --- the loop ---------------------------------------------------------------
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    if (world.state === 'playing') step(dt);
    else if (world.state === 'menu') {
      // Slow orbit over the city behind the title screen.
      const t = now / 1000;
      camera.position.set(Math.sin(t * 0.05) * 180, 90, Math.cos(t * 0.05) * 180);
      camera.lookAt(0, 0, 0);
    }
    renderer.render(scene, camera);
  }

  // --- screenshot staging -----------------------------------------------------
  if (SHOT) {
    VP.stageShot(world, SHOT);
    showOverlay(null);
    // Let the world settle one frame before the screenshot is taken.
    world.state = 'playing';
  } else {
    showOverlay('menu');
  }

  // Expose the world for play-tests and debugging.
  window.__VP = world;
  window.__VP.player = player;
  window.__VP.mission = mission;
  window.__VP.wanted = wanted;
  requestAnimationFrame(loop);
})(typeof window !== 'undefined' ? window : globalThis);
