// A small seeded random source, so a staged scene plays the same way every time.
// mulberry32: short, fast, and deterministic for a given seed.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick an integer in [min, max] from a rng.
export function intBetween(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// Pick one element of an array from a rng.
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// A random point on a road, for spawning traffic and pedestrians.
export function roadPoint(rng, roadsX, roadsZ) {
  if (rng() < 0.5) {
    return { x: pick(rng, roadsX), z: -150 + rng() * 300 };
  }
  return { x: -210 + rng() * 360, z: pick(rng, roadsZ) };
}
