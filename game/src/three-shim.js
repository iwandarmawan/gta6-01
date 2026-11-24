// The vendored three.min.js is the UMD build: `import * as THREE from 'three'`
// via an import map gives an empty namespace. This shim re-exports the global
// THREE (loaded by the classic <script> tag in index.html) as the default
// export, so every module does `import THREE from 'three'` instead.
const THREE = globalThis.THREE;
export default THREE;
