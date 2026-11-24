// city.js — builds Solmar Bay in a rainstorm: wet grid streets, lit towers,
// palms, lamps, lighthouse, marina, airfield, puddles, storm clouds, rain and
// lightning. Returns colliders and the named spots the missions use.
import THREE from './three-shim.js';
import { WORLD, STORM, PLAZA_POS, LIGHTHOUSE_POS, MARINA_POS, AIRFIELD_POS, GARAGE_POS } from './config.js';

function windowTexture(rand, base) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 10) {
    for (let x = 6; x < 58; x += 10) {
      const lit = rand() < 0.55;
      g.fillStyle = lit ? (rand() < 0.8 ? '#ffd98a' : '#9fd8ff') : '#1a2028';
      g.fillRect(x, y, 6, 7);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function box(w, h, d, color, x, y, z, opts) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0.05 }, opts || {}))
  );
  m.position.set(x, y, z);
  return m;
}

export function buildCity(scene, rand) {
  const colliders = [];
  const group = new THREE.Group();
  scene.add(group);

  // Ground + sea (sea east of WORLD.seaX).
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, WORLD.size),
    new THREE.MeshStandardMaterial({ color: STORM.ground, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 0); group.add(ground);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size - WORLD.seaX, WORLD.size),
    new THREE.MeshStandardMaterial({ color: 0x1a3a52, roughness: 0.15, metalness: 0.35 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(WORLD.seaX + (WORLD.size - WORLD.seaX) / 2, 0.05, 0); group.add(sea);

  // Streets: grid offset by the round-14 seed so the map reads differently.
  const off = 6; // grid offset (v13 used 0, v12 used -6)
  const streets = [];
  for (let s = WORLD.streetMin; s <= WORLD.streetMax; s += WORLD.streetStep) streets.push(s + off);
  const roadMat = new THREE.MeshStandardMaterial({ color: STORM.roadWet, roughness: 0.35, metalness: 0.25 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0x8a8f96 });
  for (const s of streets) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size - WORLD.seaX + 40, WORLD.roadW), roadMat);
    h.rotation.x = -Math.PI / 2; h.position.set((WORLD.seaX - 40) / 2, 0.08, s); group.add(h);
    const v = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadW, WORLD.size), roadMat);
    v.rotation.x = -Math.PI / 2; v.position.set(s, 0.08, 0); group.add(v);
    for (let d = -160; d <= 160; d += 16) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3), dashMat);
      dash.rotation.x = -Math.PI / 2; dash.position.set(d, 0.1, s); group.add(dash);
      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.5), dashMat);
      dash2.rotation.x = -Math.PI / 2; dash2.position.set(s, 0.1, d); group.add(dash2);
    }
  }

  // Buildings: blocks between streets, lit windows glowing through the rain.
  const texes = STORM.building.map((c) => windowTexture(rand, '#' + c.toString(16).padStart(6, '0')));
  for (let gx = 0; gx < streets.length - 1; gx++) {
    for (let gz = 0; gz < streets.length - 1; gz++) {
      const cx = (streets[gx] + streets[gx + 1]) / 2;
      const cz = (streets[gz] + streets[gz + 1]) / 2;
      if (cx > WORLD.seaX - 20) continue;              // no buildings in the sea
      if (Math.abs(cx - PLAZA_POS.x) < 24 && Math.abs(cz - PLAZA_POS.z) < 24) continue; // plaza
      if (Math.abs(cx - AIRFIELD_POS.x) < 45 && Math.abs(cz - AIRFIELD_POS.z) < 35) continue; // airfield
      if (Math.abs(cx - GARAGE_POS.x) < 20 && Math.abs(cz - GARAGE_POS.z) < 18) continue; // garage
      if (rand() < 0.22) continue;                      // empty lot / park
      const w = 14 + rand() * 12, d = 14 + rand() * 12, h = 8 + rand() * 24;
      const tex = texes[Math.floor(rand() * texes.length)];
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.9 }));
      b.position.set(cx, h / 2, cz);
      group.add(b);
      colliders.push({ x: cx, z: cz, hw: w / 2, hd: d / 2 });
      if (rand() < 0.35) { // rooftop beacon light
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff4444 }));
        tip.position.set(cx, h + 0.6, cz); group.add(tip);
      }
    }
  }

  // Palm Plaza: fountain, palms, beacon pillar base.
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 1.2, 20),
    new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.6 }));
  fountain.position.set(PLAZA_POS.x, 0.6, PLAZA_POS.z); group.add(fountain);
  const water = new THREE.Mesh(new THREE.CircleGeometry(6, 20),
    new THREE.MeshStandardMaterial({ color: 0x2a5a7a, roughness: 0.1, metalness: 0.4 }));
  water.rotation.x = -Math.PI / 2; water.position.set(PLAZA_POS.x, 1.25, PLAZA_POS.z); group.add(water);

  // Palms along the coast road and plaza.
  const palmSpots = [];
  for (let z = -140; z <= 140; z += 20) { palmSpots.push([WORLD.seaX - 12, z]); palmSpots.push([-60, z]); }
  for (let i = 0; i < 8; i++) palmSpots.push([PLAZA_POS.x + (rand() - 0.5) * 30, PLAZA_POS.z + (rand() - 0.5) * 30]);
  for (const [px, pz] of palmSpots) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 6),
      new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 }));
    trunk.position.set(px, 3.5, pz); group.add(trunk);
    const top = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.5, 7),
      new THREE.MeshStandardMaterial({ color: 0x2a5a2a, roughness: 0.9 }));
    top.position.set(px, 8, pz); group.add(top);
  }

  // Street lamps with warm pools of light on the wet road.
  const lampGlow = new THREE.MeshBasicMaterial({ color: 0xffd98a });
  const poolMat = new THREE.MeshBasicMaterial({ color: 0x8a6a30, transparent: true, opacity: 0.28 });
  for (const s of streets) {
    for (let d = -140; d <= 140; d += 40) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.7 }));
      pole.position.set(s + 6, 2.75, d); group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), lampGlow);
      bulb.position.set(s + 6, 5.6, d); group.add(bulb);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(3.4, 16), poolMat);
      pool.rotation.x = -Math.PI / 2; pool.position.set(s + 6, 0.12, d); group.add(pool);
    }
  }

  // Lighthouse on the east point, beam cutting through the storm.
  const lh = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4.5, 26, 12),
    new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.8 }));
  tower.position.y = 13; lh.add(tower);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.6, 3, 12),
    new THREE.MeshStandardMaterial({ color: 0xb03030, roughness: 0.8 }));
  band.position.y = 16; lh.add(band);
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 3, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  lampRoom.position.y = 27.5; lh.add(lampRoom);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(6, 45, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.10, side: THREE.DoubleSide }));
  beam.rotation.z = Math.PI / 2 - 0.12; beam.position.set(-22, 27, 0); lh.add(beam);
  lh.position.set(LIGHTHOUSE_POS.x, 0, LIGHTHOUSE_POS.z);
  group.add(lh);
  colliders.push({ x: LIGHTHOUSE_POS.x, z: LIGHTHOUSE_POS.z, hw: 5, hd: 5 });

  // Marina north-east: docks and moored skiffs.
  for (let i = 0; i < 3; i++) {
    const dock = box(3, 0.8, 22, 0x5a4632, MARINA_POS.x + i * 8, 0.4, MARINA_POS.z);
    group.add(dock);
    const boat = box(2.4, 1, 6, 0xd8d8d8, MARINA_POS.x + i * 8 + 3.5, 0.6, MARINA_POS.z + (rand() - 0.5) * 8);
    group.add(boat);
  }
  // Jetty out to the lighthouse point.
  const jetty = box(4, 0.8, 30, 0x5a4632, 162, 0.4, 0);
  group.add(jetty);

  // Airfield south-west: runway, windsock, hangar.
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(12, 90),
    new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.4, metalness: 0.2 }));
  runway.rotation.x = -Math.PI / 2; runway.position.set(AIRFIELD_POS.x, 0.09, AIRFIELD_POS.z); group.add(runway);
  const hangar = box(20, 8, 14, 0x707880, AIRFIELD_POS.x + 22, 4, AIRFIELD_POS.z);
  group.add(hangar);
  colliders.push({ x: AIRFIELD_POS.x + 22, z: AIRFIELD_POS.z, hw: 10, hd: 7 });

  // Rico's Garage south.
  const garage = box(16, 6, 12, 0x8a6a3a, GARAGE_POS.x, 3, GARAGE_POS.z);
  group.add(garage);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 2),
    new THREE.MeshBasicMaterial({ color: 0xffc040 }));
  sign.position.set(GARAGE_POS.x, 6.5, GARAGE_POS.z - 6.2); group.add(sign);
  colliders.push({ x: GARAGE_POS.x, z: GARAGE_POS.z, hw: 8, hd: 6 });

  // Puddles: shiny discs on the wet roads.
  const puddleMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.05, metalness: 0.5 });
  for (let i = 0; i < 26; i++) {
    const s = streets[Math.floor(rand() * streets.length)];
    const d = (rand() - 0.5) * 280;
    const p = new THREE.Mesh(new THREE.CircleGeometry(1.5 + rand() * 2.5, 14), puddleMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(rand() < 0.5 ? s + (rand() - 0.5) * 4 : d, 0.11, rand() < 0.5 ? d : s + (rand() - 0.5) * 4);
    group.add(p);
  }

  // Storm clouds: dark flattened spheres high up.
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0x1c242e, roughness: 1, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(30 + rand() * 30, 10, 8), cloudMat);
    c.scale.y = 0.28;
    c.position.set((rand() - 0.5) * 420, 70 + rand() * 30, (rand() - 0.5) * 420);
    group.add(c);
  }

  // Rain: 500 falling streaks around the camera.
  const RAIN_N = 500;
  const rainPos = new Float32Array(RAIN_N * 6);
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x9fb4cc, transparent: true, opacity: 0.55 }));
  rain.frustumCulled = false;
  group.add(rain);
  const drops = [];
  for (let i = 0; i < RAIN_N; i++) drops.push({ x: (rand() - 0.5) * 220, y: rand() * 50, z: (rand() - 0.5) * 220 });

  // Lightning bolt (hidden until a flash; a faint static one is placed far north-east).
  const boltPts = [];
  let bx = 0, by = 60;
  for (let i = 0; i < 8; i++) { boltPts.push(new THREE.Vector3(bx, by, 0)); bx += (rand() - 0.5) * 8; by -= 8; }
  const bolt = new THREE.Line(new THREE.BufferGeometry().setFromPoints(boltPts),
    new THREE.LineBasicMaterial({ color: 0xdfeaff, transparent: true, opacity: 0 }));
  bolt.position.set(180, 0, -190);
  group.add(bolt);

  let flashTimer = 4 + rand() * 4;
  let flashLeft = 0;

  function update(dt, t, camera, dirLight) {
    // Rain falls; in frozen shot mode dt is 0 so the streaks hold still.
    if (dt > 0) {
      const cx = camera.position.x, cz = camera.position.z;
      for (let i = 0; i < RAIN_N; i++) {
        const d = drops[i];
        d.y -= 42 * dt;
        d.x += 6 * dt; // wind slant
        if (d.y < 0) { d.y = 45 + rand() * 8; d.x = cx + (rand() - 0.5) * 220; d.z = cz + (rand() - 0.5) * 220; }
        rainPos[i * 6] = d.x; rainPos[i * 6 + 1] = d.y; rainPos[i * 6 + 2] = d.z;
        rainPos[i * 6 + 3] = d.x - 0.35; rainPos[i * 6 + 4] = d.y - 1.1; rainPos[i * 6 + 5] = d.z;
      }
      rainGeo.attributes.position.needsUpdate = true;
      // Lightning: brief flash every 6–11 s in live play only.
      flashTimer -= dt;
      if (flashTimer <= 0) { flashLeft = 0.14; flashTimer = 6 + rand() * 5; bolt.material.opacity = 0.9; }
      if (flashLeft > 0) {
        flashLeft -= dt;
        dirLight.intensity = 2.2;
        if (flashLeft <= 0) { bolt.material.opacity = 0; dirLight.intensity = STORM.sunI; }
      }
      // Lighthouse beam sweeps slowly.
      beam.rotation.y = t * 0.25;
    }
  }

  return {
    colliders,
    spots: { plaza: PLAZA_POS, garage: GARAGE_POS, lighthouse: LIGHTHOUSE_POS, marina: MARINA_POS, airfield: AIRFIELD_POS },
    update,
  };
}
