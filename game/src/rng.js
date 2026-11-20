// Solmar Bay — deterministic seeded random numbers.
// The whole city is built from one fixed seed, so every run (and every
// screenshot) looks the same. Written fresh for this entry.

// mulberry32: small, fast, good-enough PRNG for world generation.
export class RNG {
  constructor(seed) {
    this.s = seed >>> 0;
  }
  next() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  // Float in [a, b).
  range(a, b) { return a + this.next() * (b - a); }
  // Integer in [a, b] inclusive.
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  // Random element of an array.
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  // True with probability p.
  chance(p) { return this.next() < p; }
  // Random sign: -1 or +1.
  sign() { return this.next() < 0.5 ? -1 : 1; }
  // Restart the sequence from a new seed (used by tests, never in play).
  reset(seed) { this.s = seed >>> 0; }
  // A child RNG seeded from this one's next value: subsystems get their
  // own deterministic stream without disturbing the parent's sequence.
  fork() { return new RNG(Math.floor(this.next() * 4294967296)); }
  // In-place Fisher–Yates shuffle of an array.
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }
}
