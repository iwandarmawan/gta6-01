// Solmar Bay — the city itself: roads, buildings, palms, lights, beach,
// plaza, canal and bridge, all built once from the fixed seed.
// Returns the colliders (building AABBs) and the named places, so the rest
// of the game can drive, walk and stage missions against the same world.

import { COLORS, WORLD } from './config.js';
import { RNG } from './rng.js';

const T = window.THREE;

function box(w, h, d, color, x, y, z, parent) {
  const mesh = new T.Mesh(
    new T.BoxGeometry(w, h, d),
    new T.MeshLambertMaterial({ color }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(rt, rb, h, color, x, y, z, parent, seg = 8) {
  const mesh = new T.Mesh(
    new T.CylinderGeometry(rt, rb, h, seg),
    new T.MeshLambertMaterial({ color }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// A low-poly palm: a leaning trunk, a crown of flat leaves, a few coconuts.
function makePalm(rng) {
  const palm = new T.Group();
  const lean = rng.range(-0.12, 0.12);
  const trunk = cylinder(0.22, 0.34, 5.2, COLORS.palmTrunk, 0, 2.6, 0, palm, 7);
  trunk.rotation.z = lean;
  const crownY = 5.4;
  for (let i = 0; i < 6; i += 1) {
    const leaf = new T.Mesh(
      new T.ConeGeometry(0.5, 3.4, 4),
      new T.MeshLambertMaterial({ color: COLORS.palmLeaf }),
    );
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.2, crownY - 0.3, Math.sin(a) * 1.2);
    leaf.rotation.z = Math.cos(a) * 1.1;
    leaf.rotation.x = -Math.sin(a) * 1.1;
    leaf.castShadow = true;
    palm.add(leaf);
  }
  const nut = new T.Mesh(
    new T.SphereGeometry(0.28, 6, 5),
    new T.MeshLambertMaterial({ color: 0x6a4a22 }),
  );
  nut.position.set(0.3, crownY - 0.5, 0.2);
  palm.add(nut);
  return palm;
}

export function buildCity(scene) {
  const rng = new RNG(WORLD.SEED);
  const colliders = []; // {minX,maxX,minZ,maxZ} building footprints
  const group = new T.Group();
  scene.add(group);

  // ---- Ground: asphalt everywhere, then sidewalk slabs on each block. --
  const ground = new T.Mesh(
    new T.PlaneGeometry(WORLD.CITY_HALF * 2 + 220, WORLD.CITY_HALF * 2 + 220),
    new T.MeshLambertMaterial({ color: COLORS.asphalt }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(-40, 0, 0);
  ground.receiveShadow = true;
  group.add(ground);

  // ---- Beach + sea (west edge) and canal (south edge). -------------------
  const sand = new T.Mesh(
    new T.PlaneGeometry(60, WORLD.CITY_HALF * 2 + 220),
    new T.MeshLambertMaterial({ color: COLORS.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(WORLD.BEACH_X - 8, 0.05, 0);
  sand.receiveShadow = true;
  group.add(sand);
  const sea = new T.Mesh(
    new T.PlaneGeometry(180, WORLD.CITY_HALF * 2 + 220),
    new T.MeshLambertMaterial({ color: COLORS.sea }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(WORLD.SEA_X - 90, 0.02, 0);
  group.add(sea);
  const canal = new T.Mesh(
    new T.PlaneGeometry(WORLD.CITY_HALF * 2 + 220, 26),
    new T.MeshLambertMaterial({ color: COLORS.sea }),
  );
  canal.rotation.x = -Math.PI / 2;
  canal.position.set(-40, 0.03, WORLD.CANAL_Z + 13);
  group.add(canal);

  // ---- Road markings: dashed centrelines on every road. ------------------
  const dashGeo = new T.BoxGeometry(0.6, 0.06, 4);
  const dashMat = new T.MeshLambertMaterial({ color: COLORS.asphaltLine });
  const dashes = new T.InstancedMesh(dashGeo, dashMat, 1200);
  let dashCount = 0;
  for (let k = -WORLD.GRID; k <= WORLD.GRID; k += 1) {
    const c = k * WORLD.PITCH;
    for (let d = -WORLD.CITY_HALF; d < WORLD.CITY_HALF; d += 12) {
      if (dashCount >= 1200) break;
      const m = new T.Matrix4().setPosition(c, 0.08, d);
      dashes.setMatrixAt(dashCount, m);
      dashCount += 1;
      const m2 = new T.Matrix4().setPosition(d, 0.08, c);
      // Second orientation for the cross roads: rotate the dash 90 degrees.
      m2.multiply(new T.Matrix4().makeRotationY(Math.PI / 2));
      if (dashCount < 1200) {
        dashes.setMatrixAt(dashCount, m2);
        dashCount += 1;
      }
    }
  }
  dashes.count = dashCount;
  dashes.instanceMatrix.needsUpdate = true;
  group.add(dashes);

  // ---- Blocks: sidewalks, buildings, palms, lamps. -----------------------
  const roadLines = [];
  for (let k = -WORLD.GRID; k <= WORLD.GRID; k += 1) roadLines.push(k * WORLD.PITCH);

  for (let bx = -WORLD.GRID; bx < WORLD.GRID; bx += 1) {
    for (let bz = -WORLD.GRID; bz < WORLD.GRID; bz += 1) {
      const cx = (bx + 0.5) * WORLD.PITCH;
      const cz = (bz + 0.5) * WORLD.PITCH;
      // The plaza block at the centre stays open: fountain, benches, grass.
      if (bx === -1 && bz === -1) {
        const plaza = new T.Mesh(
          new T.PlaneGeometry(WORLD.BLOCK + 8, WORLD.BLOCK + 8),
          new T.MeshLambertMaterial({ color: COLORS.plaza }),
        );
        plaza.rotation.x = -Math.PI / 2;
        plaza.position.set(cx, 0.06, cz);
        plaza.receiveShadow = true;
        group.add(plaza);
        cylinder(3.2, 3.6, 0.9, 0x8a7a5a, cx, 0.45, cz, group, 12);
        const water = new T.Mesh(
          new T.CylinderGeometry(2.8, 2.8, 0.3, 12),
          new T.MeshLambertMaterial({ color: COLORS.fountain }),
        );
        water.position.set(cx, 0.95, cz);
        group.add(water);
        cylinder(0.35, 0.5, 1.6, 0x8a7a5a, cx, 1.4, cz, group, 8);
        for (let i = 0; i < 4; i += 1) {
          const a = (i / 4) * Math.PI * 2 + 0.4;
          const palm = makePalm(rng);
          palm.position.set(cx + Math.cos(a) * 15, 0, cz + Math.sin(a) * 15);
          group.add(palm);
        }
        continue;
      }
      // The park block (north-east quadrant): grass, palms, benches.
      if (bx === 2 && bz === -2) {
        const park = new T.Mesh(
          new T.PlaneGeometry(WORLD.BLOCK + 8, WORLD.BLOCK + 8),
          new T.MeshLambertMaterial({ color: COLORS.grass }),
        );
        park.rotation.x = -Math.PI / 2;
        park.position.set(cx, 0.07, cz);
        park.receiveShadow = true;
        group.add(park);
        for (let i = 0; i < 5; i += 1) {
          const palm = makePalm(rng);
          palm.position.set(cx + rng.range(-16, 16), 0, cz + rng.range(-16, 16));
          group.add(palm);
        }
        box(6, 0.8, 1.6, 0x7a5a38, cx - 8, 0.4, cz - 8, group);
        box(6, 0.8, 1.6, 0x7a5a38, cx + 8, 0.4, cz + 8, group);
        continue;
      }
      // Sidewalk slab for the block.
      const slab = new T.Mesh(
        new T.PlaneGeometry(WORLD.BLOCK + 4, WORLD.BLOCK + 4),
        new T.MeshLambertMaterial({ color: COLORS.sidewalk }),
      );
      slab.rotation.x = -Math.PI / 2;
      slab.position.set(cx, 0.05, cz);
      slab.receiveShadow = true;
      group.add(slab);
      // One or two buildings per block, varied heights and colours.
      const lots = rng.chance(0.45) ? 2 : 1;
      for (let lot = 0; lot < lots; lot += 1) {
        const w = lots === 2 ? 15 : 26;
        const d = lots === 2 ? 15 : 26;
        const ox = lots === 2 ? (lot === 0 ? -8 : 8) : 0;
        const oz = lots === 2 ? (lot === 0 ? -8 : 8) : 0;
        const h = rng.range(7, 26);
        const color = rng.pick(COLORS.building);
        const b = box(w, h, d, color, cx + ox, h / 2, cz + oz, group);
        // Rooftop detail: a small box and a water tank.
        box(w * 0.4, 1.4, d * 0.4, rng.pick(COLORS.roof), cx + ox, h + 0.7, cz + oz, group);
        cylinder(1.1, 1.1, 1.8, 0x5a5a5a, cx + ox + w * 0.22, h + 0.9, cz + oz - d * 0.2, group, 8);
        // Lit windows: a few emissive planes on the facade.
        const winMat = new T.MeshBasicMaterial({ color: 0xffe9a8 });
        for (let wi = 0; wi < 4; wi += 1) {
          if (!rng.chance(0.5)) continue;
          const win = new T.Mesh(new T.PlaneGeometry(1.6, 1.2), winMat);
          win.position.set(cx + ox - w / 2 - 0.05, rng.range(2.5, h - 1.5), cz + oz + rng.range(-d / 3, d / 3));
          win.rotation.y = -Math.PI / 2;
          group.add(win);
        }
        colliders.push({
          minX: cx + ox - w / 2 - 0.4, maxX: cx + ox + w / 2 + 0.4,
          minZ: cz + oz - d / 2 - 0.4, maxZ: cz + oz + d / 2 + 0.4,
        });
      }
      // Palms and lamps along the block edges.
      if (rng.chance(0.6)) {
        const palm = makePalm(rng);
        palm.position.set(cx - WORLD.BLOCK / 2 + 3, 0, cz + rng.range(-14, 14));
        group.add(palm);
      }
      if (rng.chance(0.7)) {
        cylinder(0.12, 0.16, 5.5, COLORS.lamp, cx + WORLD.BLOCK / 2 - 2, 2.75, cz - WORLD.BLOCK / 2 + 2, group, 6);
        const glow = new T.Mesh(
          new T.SphereGeometry(0.45, 8, 6),
          new T.MeshBasicMaterial({ color: COLORS.lampGlow }),
        );
        glow.position.set(cx + WORLD.BLOCK / 2 - 2, 5.6, cz - WORLD.BLOCK / 2 + 2);
        group.add(glow);
      }
    }
  }

  // ---- Bridge over the canal (south edge, x = 0). ------------------------
  const deck = box(16, 1.2, 34, 0x6a6a72, 0, 1.8, WORLD.CANAL_Z + 13, group);
  deck.receiveShadow = true;
  for (const side of [-1, 1]) {
    box(0.5, 1.2, 34, 0x8a8a92, side * 7.6, 3.0, WORLD.CANAL_Z + 13, group);
  }
  // Bridge piers in the water.
  cylinder(1.2, 1.4, 3.4, 0x5a5a5a, -4, 0.4, WORLD.CANAL_Z + 13, group, 8);
  cylinder(1.2, 1.4, 3.4, 0x5a5a5a, 4, 0.4, WORLD.CANAL_Z + 13, group, 8);

  // ---- Park place is built inside the block loop above (block 2,-2). ------

  // "SOLMAR BAY" west-gate sign over the beach road.
  cylinder(0.25, 0.25, 7, COLORS.lamp, -283, 3.5, 120, group, 6);
  cylinder(0.25, 0.25, 7, COLORS.lamp, -283, 3.5, 148, group, 6);
  box(0.6, 2.2, 28, 0x1a3a5a, -283, 6.6, 134, group);

  return { colliders, group };
}

// Circle (x, z, radius) against building AABBs: push out and report hit.
// Returns true when a collision happened (used for damage + sliding).
export function collideCircle(colliders, x, z, r) {
  let hit = false;
  for (let i = 0; i < colliders.length; i += 1) {
    const c = colliders[i];
    const nx = Math.max(c.minX, Math.min(x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - nx;
    const dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = nx + (dx / d) * r;
        z = nz + (dz / d) * r;
      } else {
        // Dead centre inside a building: shove out along the smallest side.
        const pushL = x - c.minX + r;
        const pushR = c.maxX - x + r;
        const pushT = z - c.minZ + r;
        const pushB = c.maxZ - z + r;
        const m = Math.min(pushL, pushR, pushT, pushB);
        if (m === pushL) x = c.minX - r;
        else if (m === pushR) x = c.maxX + r;
        else if (m === pushT) z = c.minZ - r;
        else z = c.maxZ + r;
      }
    }
  }
  return { hit, x, z };
}
