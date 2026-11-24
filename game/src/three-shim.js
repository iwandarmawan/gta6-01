// three-shim.js — the vendored three.min.js is the UMD build (r150+), which
// sets window.THREE when loaded as a classic script and exports nothing as
// an ES module (importing it as a module gives an empty namespace, so
// THREE.WebGLRenderer is not a constructor). This shim re-exports the
// global as the default export for the rest of the game.
const THREE = globalThis.THREE;
export default THREE;
