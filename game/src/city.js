// city.js — Solmar Bay: a deterministic sun-soaked coastal grid city.
// One seed builds the same streets, buildings, palms and beach every run.
// Exports VP.buildCity(scene, seed) -> { colliders, roads, plaza, bounds }.
(function (global) {
  'use strict';

  const BLOCK = 36; // a city block is 36 m across
  const ROAD = 12; // roads are 12 m wide
  const PITCH = BLOCK + ROAD; // 48 m from one road centre to the next
  const GRID = 10; // 10 blocks each way, 11 roads each way
  const HALF = (GRID * PITCH) / 2; // 240 m: city edge
  const BEACH_X = HALF + 40; // sand ends here, the sea begins

  // Warm pastel building colours, plus glass blue for the downtown towers.
  const PALETTE = [
    0xe8d8b0, 0xd9b48f, 0xc9a06a, 0xb7c4c9, 0x9fb8c8,
    0xe6b8a2, 0xd8c9a3, 0xa8b89a, 0xc4a4a4, 0x8fa8bf,
    0xe0d0c0, 0x7fa3c0, 0x5f8fb0, 0xd0b090,
  ];

  // A canvas texture of lit and dark windows, repeated over a facade.
  function windowTexture(rng, litRatio) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#20242c';
    g.fillRect(0, 0, 64, 128);
    for (let y = 4; y < 124; y += 12) {
      for (let x = 4; x < 60; x += 10) {
        if (rng.chance(litRatio)) {
          g.fillStyle = rng.pick(['#ffd98a', '#fff2c0', '#9fd8ff']);
        } else {
          g.fillStyle = '#3a4552';
        }
        g.fillRect(x, y, 6, 8);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function box(w, h, d, color, x, y, z, mat) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      mat || new THREE.MeshLambertMaterial({ color: color })
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function buildCity(scene, seed) {
    const rng = VP.makeRng(seed);
    const colliders = [];
    const group = new THREE.Group();
    group.name = 'city';
    const m4 = new THREE.Matrix4(); // reused for every instanced mesh

    // --- ground: pale sidewalk concrete under everything -----------------
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF * 2 + 220, HALF * 2 + 40),
      new THREE.MeshLambertMaterial({ color: 0xb8b0a0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(60, 0, 0);
    ground.receiveShadow = true;
    group.add(ground);

    // --- roads: dark asphalt strips, one per grid line -------------------
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x33363c });
    const roadLines = [];
    for (let i = 0; i <= GRID; i++) roadLines.push(-HALF + i * PITCH);
    for (const p of roadLines) {
      const alongX = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, ROAD), roadMat);
      alongX.rotation.x = -Math.PI / 2;
      alongX.position.set(0, 0.02, p);
      alongX.receiveShadow = true;
      group.add(alongX);
      const alongZ = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, HALF * 2), roadMat);
      alongZ.rotation.x = -Math.PI / 2;
      alongZ.position.set(p, 0.02, 0);
      alongZ.receiveShadow = true;
      group.add(alongZ);
    }

    // --- centre dashes: one instanced mesh for every road ----------------
    const dashGeo = new THREE.BoxGeometry(0.35, 0.06, 3);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xf2e9c9 });
    const dashCount = roadLines.length * 2 * 40;
    const dashes = new THREE.InstancedMesh(dashGeo, dashMat, dashCount);
    let di = 0;
    for (const p of roadLines) {
      for (let k = 0; k < 40; k++) {
        const t = -HALF + 6 + k * 12;
        m4.makeTranslation(t, 0.06, p);
        dashes.setMatrixAt(di++, m4);
        m4.makeTranslation(p, 0.06, t);
        dashes.setMatrixAt(di++, m4);
      }
    }
    dashes.count = di;
    group.add(dashes);

    // --- beach + sea on the east edge -------------------------------------
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(50, HALF * 2 + 40),
      new THREE.MeshLambertMaterial({ color: 0xe8d8a8 })
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(HALF + 25, 0.01, 0);
    sand.receiveShadow = true;
    group.add(sand);
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(160, HALF * 2 + 40),
      new THREE.MeshLambertMaterial({ color: 0x2f7fb8 })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(BEACH_X + 80, 0, 0);
    group.add(sea);
    const sea2 = new THREE.Mesh(
      new THREE.PlaneGeometry(160, HALF * 2 + 40),
      new THREE.MeshLambertMaterial({ color: 0x4fa8dd, transparent: true, opacity: 0.45 })
    );
    sea2.rotation.x = -Math.PI / 2;
    sea2.position.set(BEACH_X + 80, 0.15, 0);
    group.add(sea2);

    // --- buildings, one or two per block ----------------------------------
    const winTexA = windowTexture(rng, 0.35);
    const winTexB = windowTexture(rng, 0.55);
    const winTexC = windowTexture(rng, 0.2);
    const winTexes = [winTexA, winTexB, winTexC];
    const plazaBlock = { i: 4, j: 4 }; // the central plaza
    const parkBlock = { i: 1, j: 7 }; // a small green park
    const downtown = function (i, j) {
      const dx = Math.abs(i - 4.5);
      const dz = Math.abs(j - 4.5);
      return dx + dz < 3;
    };

    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const cx = -HALF + PITCH * i + ROAD / 2 + BLOCK / 2;
        const cz = -HALF + PITCH * j + ROAD / 2 + BLOCK / 2;
        if (i === plazaBlock.i && j === plazaBlock.j) continue;
        if (i === parkBlock.i && j === parkBlock.j) continue;
        const count = rng.chance(0.35) ? 1 : 2;
        for (let b = 0; b < count; b++) {
          const tall = downtown(i, j) && rng.chance(0.6);
          const w = rng.range(10, 18);
          const d = rng.range(10, 18);
          const h = tall ? rng.range(30, 62) : rng.range(8, 26);
          const ox = count === 1 ? 0 : (b === 0 ? -8 : 8);
          const oz = count === 1 ? 0 : (b === 0 ? 6 : -6);
          const x = cx + ox;
          const z = cz + oz;
          const tex = rng.pick(winTexes);
          tex.repeat.set(Math.max(1, Math.round(w / 6)), Math.max(1, Math.round(h / 9)));
          const mat = new THREE.MeshLambertMaterial({
            color: rng.pick(PALETTE),
            map: tex.clone(),
          });
          mat.map.needsUpdate = true;
          const bld = box(w, h, d, 0, x, h / 2, z, mat);
          group.add(bld);
          // Rooftop clutter: an AC box, sometimes a water tower.
          const ac = box(rng.range(2, 4), 1.2, rng.range(2, 4), 0x8a8f94, x + rng.range(-3, 3), h + 0.6, z + rng.range(-3, 3));
          group.add(ac);
          if (rng.chance(0.3)) {
            const tower = new THREE.Mesh(
              new THREE.CylinderGeometry(1.6, 1.6, 3, 8),
              new THREE.MeshLambertMaterial({ color: 0x7a5a3a })
            );
            tower.position.set(x + w / 4, h + 2.2, z - d / 4);
            tower.castShadow = true;
            group.add(tower);
          }
          colliders.push({
            minX: x - w / 2, maxX: x + w / 2,
            minZ: z - d / 2, maxZ: z + d / 2,
          });
        }
      }
    }

    // --- the central plaza: fountain, benches, palms ----------------------
    const plaza = { x: -HALF + PITCH * 4 + ROAD / 2 + BLOCK / 2, z: -HALF + PITCH * 4 + ROAD / 2 + BLOCK / 2 };
    const plazaSlab = new THREE.Mesh(
      new THREE.CylinderGeometry(13, 13, 0.4, 24),
      new THREE.MeshLambertMaterial({ color: 0xc9bda6 })
    );
    plazaSlab.position.set(plaza.x, 0.2, plaza.z);
    plazaSlab.receiveShadow = true;
    group.add(plazaSlab);
    const fountain = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 4.6, 1.2, 16),
      new THREE.MeshLambertMaterial({ color: 0x8fa8bf })
    );
    fountain.position.set(plaza.x, 0.6, plaza.z);
    fountain.castShadow = true;
    group.add(fountain);
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.4, 0.3, 16),
      new THREE.MeshLambertMaterial({ color: 0x4fa8dd })
    );
    water.position.set(plaza.x, 1.2, plaza.z);
    group.add(water);
    colliders.push({
      minX: plaza.x - 4.6, maxX: plaza.x + 4.6,
      minZ: plaza.z - 4.6, maxZ: plaza.z + 4.6,
    });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const bx = plaza.x + Math.cos(a) * 10;
      const bz = plaza.z + Math.sin(a) * 10;
      group.add(box(3, 0.5, 1, 0x8a7a5a, bx, 0.45, bz));
    }

    // --- the park: grass, trees, a pond ------------------------------------
    const park = { x: -HALF + PITCH * 1 + ROAD / 2 + BLOCK / 2, z: -HALF + PITCH * 7 + ROAD / 2 + BLOCK / 2 };
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(BLOCK - 4, BLOCK - 4),
      new THREE.MeshLambertMaterial({ color: 0x6fae5a })
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(park.x, 0.03, park.z);
    grass.receiveShadow = true;
    group.add(grass);
    const pond = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6, 0.3, 16),
      new THREE.MeshLambertMaterial({ color: 0x4fa8dd })
    );
    pond.position.set(park.x + 6, 0.2, park.z - 4);
    group.add(pond);

    // --- palms: instanced trunks + fronds, along sidewalks and the beach ---
    const palmSpots = [];
    for (let i = 0; i <= GRID; i++) {
      for (let k = 0; k < 5; k++) {
        const t = -HALF + 30 + k * 96 + rng.range(-8, 8);
        palmSpots.push([t, -HALF + i * PITCH + 8]);
        palmSpots.push([-HALF + i * PITCH + 8, t]);
      }
    }
    for (let k = 0; k < 10; k++) palmSpots.push([HALF + 12 + rng.range(-4, 4), -200 + k * 44]);
    for (let k = 0; k < 8; k++) {
      const a = rng.range(0, Math.PI * 2);
      palmSpots.push([plaza.x + Math.cos(a) * 15, plaza.z + Math.sin(a) * 15]);
      palmSpots.push([park.x + rng.range(-14, 14), park.z + rng.range(-14, 14)]);
    }
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 6, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
    const frondGeo = new THREE.ConeGeometry(2.6, 2.2, 7);
    const frondMat = new THREE.MeshLambertMaterial({ color: 0x3f8f3f });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palmSpots.length);
    const fronds = new THREE.InstancedMesh(frondGeo, frondMat, palmSpots.length);
    palmSpots.forEach(function (p, idx) {
      m4.makeTranslation(p[0], 3, p[1]);
      trunks.setMatrixAt(idx, m4);
      m4.makeTranslation(p[0], 6.6, p[1]);
      fronds.setMatrixAt(idx, m4);
    });
    trunks.castShadow = true;
    group.add(trunks);
    group.add(fronds);

    // --- street lights along the main avenue -------------------------------
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7, 6);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x44484e });
    const lampGeo = new THREE.SphereGeometry(0.35, 8, 6);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
    const lightSpots = [];
    for (let i = 0; i <= GRID; i++) {
      for (let k = 0; k < 5; k++) {
        const t = -HALF + 24 + k * 96;
        lightSpots.push([t, -HALF + i * PITCH + 6.8]);
        lightSpots.push([-HALF + i * PITCH + 6.8, t]);
      }
    }
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, lightSpots.length);
    const lamps = new THREE.InstancedMesh(lampGeo, lampMat, lightSpots.length);
    lightSpots.forEach(function (p, idx) {
      m4.makeTranslation(p[0], 3.5, p[1]);
      poles.setMatrixAt(idx, m4);
      m4.makeTranslation(p[0], 7.1, p[1]);
      lamps.setMatrixAt(idx, m4);
    });
    group.add(poles);
    group.add(lamps);

    // --- beach umbrellas ----------------------------------------------------
    for (let k = 0; k < 8; k++) {
      const ux = HALF + 14 + rng.range(-6, 6);
      const uz = -180 + k * 52 + rng.range(-8, 8);
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6),
        new THREE.MeshLambertMaterial({ color: 0xdddddd })
      );
      pole.position.set(ux, 1.3, uz);
      group.add(pole);
      const top = new THREE.Mesh(
        new THREE.ConeGeometry(2.2, 1, 8),
        new THREE.MeshLambertMaterial({ color: rng.pick([0xe85a5a, 0x5a8fe8, 0xf2d05a, 0xffffff]) })
      );
      top.position.set(ux, 3, uz);
      group.add(top);
    }

    // --- clouds: soft white blobs drifting high above -----------------------
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let k = 0; k < 10; k++) {
      const cl = new THREE.Mesh(new THREE.SphereGeometry(rng.range(8, 16), 8, 6), cloudMat);
      cl.scale.y = 0.35;
      cl.position.set(rng.range(-260, 320), rng.range(70, 110), rng.range(-260, 260));
      group.add(cl);
    }

    // --- lights and sky ------------------------------------------------------
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.25);
    sun.position.set(120, 180, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -260;
    sun.shadow.camera.right = 260;
    sun.shadow.camera.top = 260;
    sun.shadow.camera.bottom = -260;
    sun.shadow.camera.far = 600;
    group.add(sun);
    group.add(new THREE.HemisphereLight(0xbfd8ff, 0x8a7a5a, 0.75));
    scene.background = new THREE.Color(0x8ec8ee);
    scene.fog = new THREE.Fog(0x8ec8ee, 260, 620);

    scene.add(group);
    return {
      colliders: colliders,
      roads: roadLines,
      plaza: plaza,
      park: park,
      bounds: { minX: -HALF - 6, maxX: BEACH_X + 160, minZ: -HALF - 6, maxZ: HALF + 6 },
      half: HALF,
      pitch: PITCH,
      road: ROAD,
    };
  }

  global.VP = global.VP || {};
  global.VP.buildCity = buildCity;
  global.VP.CITY = { BLOCK: BLOCK, ROAD: ROAD, PITCH: PITCH, GRID: GRID, HALF: HALF, BEACH_X: BEACH_X };
})(typeof window !== 'undefined' ? window : globalThis);
