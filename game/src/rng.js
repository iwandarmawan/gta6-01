// Seeded random helpers for Solmar Bay (night build). One small deterministic
// source so the city layout is the same on every load.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng, a, b) {
  return a + rng() * (b - a);
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function int(rng, a, b) {
  return a + Math.floor(rng() * (b - a + 1));
}
