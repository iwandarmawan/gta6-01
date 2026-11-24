// three-shim.js — the vendored three.min.js is the UMD build: it only exists as
// globalThis.THREE after the classic <script> in index.html runs. Re-export it
// as the default export so modules can `import THREE from './three-shim.js'`.
const THREE = globalThis.THREE;
export default THREE;
