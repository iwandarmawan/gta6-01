// Solmar Bay itself: the island, its roads and buildings, the bridge over
// the channel, the marina, the lighthouse point and the airfield, plus the
// sun and the day/night cycle. Also owns collision: building footprints,
// the water test and the ground height, which the player, cars and traffic
// all read.

const THREE = window.THREE;
import { WORLD, ROADS_X, ROADS_Z, ROAD_WIDTH, PALETTE, CACHE_SPOTS } from './config.js';
import { makeRng, pick, range, rangeInt } from './rng.js';

function makeTextTexture(text, fg, bg, font) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = fg;
  ctx.font = font || 'bold 64px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeWindowTexture(base, lit) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 256);
  const rng = makeRng(base.length * 7919 + 13);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 4; col++) {
      const on = rng() < 0.55;
      ctx.fillStyle = on ? (lit ? '#ffd98a' : '#2a3542') : '#1c2430';
      ctx.fillRect(12 + col * 28, 14 + row * 30, 18, 20);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function isWater(x, z) {
  if (z > WORLD.coastZ || x < WORLD.westX) return true;
  const c = WORLD.channel;
  return x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1;
}

export function groundHeight(x, z) {
  // The bridge deck sits a little above the road.
  if (x > WORLD.bridgeX0 - 2 && x < WORLD.bridgeX1 + 2 && z > WORLD.bridgeZ - 7 && z < WORLD.bridgeZ + 7) return 0.35;
  return 0;
}

export function buildCity(G) {
  const THREE = G.THREE;
  const rng = makeRng(20261124);
  const city = {
    buildings: [],
    colliders: [],
    lamps: [],
    windowMats: [],
    palms: [],
    trafficLoops: [
      { x0: -160, x1: 0, z0: -120, z1: 40 },
      { x0: 120, x1: 200, z0: -80, z1: 80 },
      { x0: -160, x1: 160, z0: -160, z1: -80 },
      { x0: -200, x1: 0, z0: 80, z1: 160 },
    ],
    garagePos: { x: -20, z: 24 },
    plazaPos: { x: 0, z: 0 },
  };
  G.city = city;

  // --- Ground and sea -------------------------------------------------
  const landGeo = new THREE.PlaneGeometry(460, 380);
  const landMat = new THREE.MeshLambertMaterial({ color: PALETTE.land });
  const land = new THREE.Mesh(landGeo, landMat);
  land.rotation.x = -Math.PI / 2;
  land.position.set(0, -0.05, 0);
  G.scene.add(land);

  const sandGeo = new THREE.PlaneGeometry(460, 26);
  const sandMat = new THREE.MeshLambertMaterial({ color: PALETTE.sand });
  const sand = new THREE.Mesh(sandGeo, sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, 172);
  G.scene.add(sand);

  const seaGeo = new THREE.PlaneGeometry(900, 900);
  const seaMat = new THREE.MeshLambertMaterial({ color: PALETTE.sea });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.4, 420);
  G.scene.add(sea);
  city.sea = sea;

  // Channel water (the cut from the south coast).
  const channelGeo = new THREE.PlaneGeometry(60, 90);
  const channelMat = new THREE.MeshLambertMaterial({ color: PALETTE.seaDeep });
  const channel = new THREE.Mesh(channelGeo, channelMat);
  channel.rotation.x = -Math.PI / 2;
  channel.position.set(60, -0.35, 135);
  G.scene.add(channel);

  // --- Roads and sidewalks --------------------------------------------
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  function roadStrip(x, z, w, d) {
    const geo = new THREE.BoxGeometry(w, 0.12, d);
    const mesh = new THREE.Mesh(geo, roadMat);
    mesh.position.set(x, 0.06, z);
    G.scene.add(mesh);
  }
  function walkStrip(x, z, w, d) {
    const geo = new THREE.BoxGeometry(w, 0.1, d);
    const mesh = new THREE.Mesh(geo, walkMat);
    mesh.position.set(x, 0.05, z);
    G.scene.add(mesh);
  }
  for (const x of ROADS_X) {
    roadStrip(x, 0, ROAD_WIDTH, 360);
    walkStrip(x - 7.5, 0, 5, 360);
    walkStrip(x + 7.5, 0, 5, 360);
  }
  for (const z of ROADS_Z) {
    roadStrip(0, z, 440, ROAD_WIDTH);
    walkStrip(0, z - 7.5, 440, 5);
    walkStrip(0, z + 7.5, 440, 5);
  }
  // The channel interrupts the coast road; pave around it instead.
  const gapGeo = new THREE.BoxGeometry(60, 0.14, ROAD_WIDTH);
  const gapMesh = new THREE.Mesh(gapGeo, new THREE.MeshLambertMaterial({ color: PALETTE.seaDeep }));
  gapMesh.position.set(60, 0.05, 160);
  G.scene.add(gapMesh);

  // --- Bridge over the channel ----------------------------------------
  const deckMat = new THREE.MeshLambertMaterial({ color: 0x8a7a5a });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(64, 0.7, 16), deckMat);
  deck.position.set(60, 0.35, WORLD.bridgeZ);
  G.scene.add(deck);
  const railMat = new THREE.MeshLambertMaterial({ color: 0xd43a2a });
  for (const dz of [-7.5, 7.5]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(64, 1.0, 0.6), railMat);
    rail.position.set(60, 1.2, WORLD.bridgeZ + dz);
    G.scene.add(rail);
  }
  const signTex = makeTextTexture('SOLMAR BAY', '#f2f2f2', '#1a5a7a');
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 5.5),
    new THREE.MeshBasicMaterial({ map: signTex }),
  );
  sign.position.set(60, 7.5, WORLD.bridgeZ - 8.2);
  G.scene.add(sign);

  // --- Buildings -------------------------------------------------------
  const windowTexes = PALETTE.building.map((c) => makeWindowTexture('#' + c.toString(16).padStart(6, '0'), true));
  const roofMats = PALETTE.roof.map((c) => new THREE.MeshLambertMaterial({ color: c }));
  function addBuilding(cx, cz, w, d, h) {
    const tex = pick(rng, windowTexes);
    const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffc46a, emissiveIntensity: 0 });
    city.windowMats.push(mat);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(cx, h / 2, cz);
    G.scene.add(mesh);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.8, d + 0.6), pick(rng, roofMats));
    roof.position.set(cx, h + 0.4, cz);
    G.scene.add(roof);
    city.buildings.push({ x: cx, z: cz, w, d, h });
    city.colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });
  }
  for (let i = 0; i < ROADS_X.length - 1; i++) {
    for (let j = 0; j < ROADS_Z.length - 1; j++) {
      const bx0 = ROADS_X[i] + 8;
      const bx1 = ROADS_X[i + 1] - 8;
      const bz0 = ROADS_Z[j] + 8;
      const bz1 = ROADS_Z[j + 1] - 8;
      const cx = (bx0 + bx1) / 2;
      const cz = (bz0 + bz1) / 2;
      // Skip the channel, the plaza park, the airfield and the marina strip.
      if (cx > 20 && cx < 100 && cz > 80) continue;
      if (Math.abs(cx) < 30 && Math.abs(cz) < 30) continue;
      if (cx > 110 && cz < -130) continue;
      if (cz > 150 && cx > -30 && cx < 120) continue;
      const count = rangeInt(rng, 1, 3);
      for (let k = 0; k < count; k++) {
        const w = range(rng, 10, 18);
        const d = range(rng, 10, 18);
        const h = range(rng, 8, 38);
        const ox = range(rng, -6, 6);
        const oz = range(rng, -6, 6);
        addBuilding(cx + ox, cz + oz, w, d, h);
      }
    }
  }

  // --- Palm Plaza park --------------------------------------------------
  const parkMat = new THREE.MeshLambertMaterial({ color: 0x6a9a5a });
  const park = new THREE.Mesh(new THREE.BoxGeometry(44, 0.3, 44), parkMat);
  park.position.set(0, 0.15, 0);
  G.scene.add(park);
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 6, 1.2, 12),
    new THREE.MeshLambertMaterial({ color: 0x9fc3d4 }),
  );
  fountain.position.set(0, 0.8, 0);
  G.scene.add(fountain);
  city.colliders.push({ x0: -6, x1: 6, z0: -6, z1: 6 });

  // --- Garage (Rico's) --------------------------------------------------
  const garageTex = makeTextTexture('RICO\u2019S GARAGE', '#ffd98a', '#2a2a30');
  const garage = new THREE.Mesh(
    new THREE.BoxGeometry(18, 7, 12),
    new THREE.MeshLambertMaterial({ color: 0x8a8a92 }),
  );
  garage.position.set(-20, 3.5, 24);
  G.scene.add(garage);
  const garageSign = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 4),
    new THREE.MeshBasicMaterial({ map: garageTex }),
  );
  garageSign.position.set(-20, 8.2, 17.8);
  G.scene.add(garageSign);
  city.colliders.push({ x0: -29, x1: -11, z0: 18, z1: 30 });

  // --- Marina docks ------------------------------------------------------
  const dockMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
  for (const dx of [40, 60, 80]) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 26), dockMat);
    dock.position.set(dx, 0.2, 162);
    G.scene.add(dock);
  }
  const marinaTex = makeTextTexture('MARINA', '#f2f2f2', '#1d5a74');
  const marinaSign = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 3.5),
    new THREE.MeshBasicMaterial({ map: marinaTex }),
  );
  marinaSign.position.set(60, 5, 152);
  G.scene.add(marinaSign);

  // --- Lighthouse point ---------------------------------------------------
  const lightMat = new THREE.MeshLambertMaterial({ color: PALETTE.lighthouse });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.2, 26, 12), lightMat);
  tower.position.set(-206, 13, 150);
  G.scene.add(tower);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(3.5, 3.8, 4, 12),
    new THREE.MeshLambertMaterial({ color: PALETTE.lighthouseTop }),
  );
  band.position.set(-206, 18, 150);
  G.scene.add(band);
  const lampHouse = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 3, 10),
    new THREE.MeshLambertMaterial({ color: 0xffe9a0, emissive: 0xffd76a, emissiveIntensity: 0.8 }),
  );
  lampHouse.position.set(-206, 27.5, 150);
  G.scene.add(lampHouse);
  city.lighthouseLamp = lampHouse;
  city.colliders.push({ x0: -211, x1: -201, z0: 145, z1: 155 });
  const beamGeo = new THREE.ConeGeometry(6, 40, 12, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffe9a0, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(-186, 27.5, 150);
  G.scene.add(beam);
  city.beam = beam;

  // --- Airfield ------------------------------------------------------------
  const runway = new THREE.Mesh(
    new THREE.BoxGeometry(80, 0.15, 14),
    new THREE.MeshLambertMaterial({ color: 0x2a2a30 }),
  );
  runway.position.set(165, 0.08, -155);
  G.scene.add(runway);
  const hangar = new THREE.Mesh(
    new THREE.BoxGeometry(16, 8, 12),
    new THREE.MeshLambertMaterial({ color: 0x7a8a9a }),
  );
  hangar.position.set(140, 4, -140);
  G.scene.add(hangar);
  city.colliders.push({ x0: 132, x1: 148, z0: -146, z1: -134 });
  const fieldTex = makeTextTexture('SOLMAR AIRFIELD', '#f2f2f2', '#3a5a3a');
  const fieldSign = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 4.5),
    new THREE.MeshBasicMaterial({ map: fieldTex }),
  );
  fieldSign.position.set(165, 6, -146);
  G.scene.add(fieldSign);
  // A parked prop plane.
  const plane = new THREE.Group();
  const fus = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 10, 10),
    new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }),
  );
  fus.rotation.x = Math.PI / 2;
  plane.add(fus);
  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.3, 2.4),
    new THREE.MeshLambertMaterial({ color: 0xd43a2a }),
  );
  plane.add(wing);
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(4, 2.4, 0.3),
    new THREE.MeshLambertMaterial({ color: 0xd43a2a }),
  );
  tail.position.set(0, 1.2, -4.6);
  plane.add(tail);
  plane.position.set(180, 1.6, -155);
  plane.rotation.y = Math.PI / 2;
  G.scene.add(plane);

  // --- Palms and streetlights ----------------------------------------------
  const trunkMat = new THREE.MeshLambertMaterial({ color: PALETTE.palmTrunk });
  const leafMat = new THREE.MeshLambertMaterial({ color: PALETTE.palmLeaf });
  function addPalm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 8), trunkMat);
    trunk.position.y = 3.5;
    g.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.5, 8), leafMat);
    crown.position.y = 8.2;
    g.add(crown);
    g.position.set(x, 0, z);
    G.scene.add(g);
  }
  for (let i = 0; i < 46; i++) {
    const side = pick(rng, ['coast', 'road', 'plaza']);
    if (side === 'coast') addPalm(range(rng, -210, 210), range(rng, 164, 176));
    else if (side === 'plaza') addPalm(range(rng, -18, 18), range(rng, -18, 18));
    else addPalm(pick(rng, ROADS_X) + 9, range(rng, -160, 160));
  }
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2a2a30 });
  const bulbMat = new THREE.MeshLambertMaterial({ color: 0xffe9a0, emissive: 0xffd76a, emissiveIntensity: 0 });
  for (const x of [-160, -80, 0, 80, 160]) {
    for (const z of [-120, -40, 40, 120]) {
      if (isWater(x + 8, z)) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6, 6), poleMat);
      pole.position.set(x + 8, 3, z);
      G.scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), bulbMat);
      bulb.position.set(x + 8, 6.2, z);
      G.scene.add(bulb);
      city.lamps.push(bulb);
    }
  }
  city.bulbMat = bulbMat;

  // --- Stunt ramp by the bridge ---------------------------------------------
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(8, 1.2, 10),
    new THREE.MeshLambertMaterial({ color: 0xd4a017 }),
  );
  ramp.position.set(60, 0.6, 96);
  ramp.rotation.x = -0.35;
  G.scene.add(ramp);
  city.ramp = { x: 60, z: 100 };

  // --- Collectible packages ---------------------------------------------------
  city.caches = CACHE_SPOTS.map((spot) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshLambertMaterial({ color: 0xffd21f, emissive: 0xffb400, emissiveIntensity: 0.5 }),
    );
    mesh.position.set(spot.x, 1.2, spot.z);
    G.scene.add(mesh);
    return { ...spot, mesh, taken: false };
  });

  // --- Lights and sky ---------------------------------------------------------
  const sun = new THREE.DirectionalLight(0xfff2d0, 2.6);
  sun.position.set(120, 180, 60);
  G.scene.add(sun);
  G.scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 0.9);
  G.scene.add(hemi);
  G.scene.fog = new THREE.Fog(0xcfe8f2, 220, 700);
  G.sun = sun;
  G.hemi = hemi;
  updateDayNight(G, 0);
  return city;
}

const SKY_DAY = new THREE.Color(0x8fc7e8);
const SKY_SUNSET = new THREE.Color(0xf2a65a);
const SKY_NIGHT = new THREE.Color(0x0e1a2e);
const FOG_DAY = new THREE.Color(0xcfe8f2);
const FOG_NIGHT = new THREE.Color(0x0e1a2e);

export function updateDayNight(G, dt) {
  G.dayT = (G.dayT + dt / 240) % 1;
  const t = G.dayT;
  // Sun elevation: 0.25 sunrise, 0.5 noon, 0.75 sunset.
  const ang = (t - 0.25) * Math.PI * 2;
  const elev = Math.sin(ang);
  const sun = G.sun;
  sun.position.set(Math.cos(ang) * 260, Math.max(20, elev * 260), 120);
  const night = elev < 0.05;
  const dayFactor = Math.max(0, Math.min(1, elev * 1.6));
  const sunsetFactor = Math.max(0, 1 - Math.abs(elev) * 3) * (t > 0.4 && t < 0.9 ? 1 : 0);
  sun.intensity = night ? 0.25 : 1.2 + dayFactor * 1.6;
  sun.color.setHex(night ? 0x8aa0c8 : 0xfff2d0);
  G.hemi.intensity = night ? 0.25 : 0.5 + dayFactor * 0.5;
  const sky = new THREE.Color().copy(SKY_DAY);
  if (sunsetFactor > 0) sky.lerp(SKY_SUNSET, sunsetFactor * 0.7);
  if (night) sky.lerp(SKY_NIGHT, 1 - dayFactor);
  G.scene.background = sky;
  G.scene.fog.color.copy(night ? FOG_NIGHT : FOG_DAY);
  const lampOn = night ? 1 : 0;
  if (G.city && G.city.bulbMat) G.city.bulbMat.emissiveIntensity = lampOn * 1.6;
  if (G.city && G.city.windowMats) {
    for (const m of G.city.windowMats) m.emissiveIntensity = night ? 0.7 : 0;
  }
  if (G.city && G.city.beam) {
    G.city.beam.visible = night;
    G.city.beam.rotation.y += dt * 0.6;
  }
  G.isNight = night;
}

export function resolveCollision(G, pos, radius) {
  // Push a circle out of every building footprint it overlaps.
  for (const c of G.city.colliders) {
    const nx = Math.max(c.x0, Math.min(pos.x, c.x1));
    const nz = Math.max(c.z0, Math.min(pos.z, c.z1));
    const dx = pos.x - nx;
    const dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * radius;
        pos.z = nz + (dz / d) * radius;
      } else {
        pos.x = c.x1 + radius;
      }
    }
  }
  // Island bounds.
  pos.x = Math.max(WORLD.minX + 2, Math.min(WORLD.maxX - 2, pos.x));
  pos.z = Math.max(WORLD.minZ + 2, Math.min(WORLD.maxZ - 2, pos.z));
}

export function randomSidewalkPoint(G, rng) {
  for (let tries = 0; tries < 12; tries++) {
    const onXRoad = rng() < 0.5;
    let x;
    let z;
    if (onXRoad) {
      x = pick(rng, ROADS_X) + (rng() < 0.5 ? -7.5 : 7.5);
      z = range(rng, -170, 170);
    } else {
      x = range(rng, -210, 210);
      z = pick(rng, ROADS_Z) + (rng() < 0.5 ? -7.5 : 7.5);
    }
    if (!isWater(x, z)) return { x, z };
  }
  return { x: 0, z: -20 };
}
