// rng.js — deterministic seeded random numbers for Solmar Bay.
// The whole city is generated from one seed, so a screenshot with
// ?seed=N always shows the same streets, buildings and traffic.
(function (global) {
  'use strict';

  // mulberry32: a small, fast seeded PRNG with a good distribution.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A small helper object around one seeded stream.
  function makeRng(seed) {
    const next = mulberry32(seed);
    return {
      next: next,
      // Float in [min, max).
      range: function (min, max) {
        return min + next() * (max - min);
      },
      // Whole number in [min, max] inclusive.
      int: function (min, max) {
        return Math.floor(min + next() * (max - min + 1));
      },
      // True with probability p (0..1).
      chance: function (p) {
        return next() < p;
      },
      // One element of an array, uniformly.
      pick: function (arr) {
        return arr[Math.floor(next() * arr.length)];
      },
      // A shuffled copy of an array (Fisher-Yates).
      shuffle: function (arr) {
        const out = arr.slice();
        for (let i = out.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          const tmp = out[i];
          out[i] = out[j];
          out[j] = tmp;
        }
        return out;
      },
    };
  }

  global.VP = global.VP || {};
  global.VP.makeRng = makeRng;
  global.VP.mulberry32 = mulberry32;
})(typeof window !== 'undefined' ? window : globalThis);
