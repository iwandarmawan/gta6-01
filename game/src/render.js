// Renderer, sunset sky, lighting and the chase camera. Everything here is
// plain three.js on the vendored build (window.THREE, UMD r150).
const THREE = window.THREE;

import { SUNSET } from './config.js';

// A canvas texture with centred text, for signs.
export function makeTextTexture(text, options = {}) {
  const w = options.w ?? 512;
  const h = options.h ?? 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (options.bg) {
    ctx.fillStyle = options.bg;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.font = options.font ?? 'bold 64px sans-serif';
  ctx.fillStyle = options.fg ?? '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

// A vertical gradient sky dome: deep purple overhead, orange-pink at the
// horizon, warm gold low over the sea where the sun sits.
function makeSkyDome() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0.0, '#2e1a52');
  g.addColorStop(0.45, '#7a3a6a');
  g.addColorStop(0.72, '#ff7e5f');
  g.addColorStop(0.88, '#ffc46b');
  g.addColorStop(1.0, '#ffb347');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  const geo = new THREE.SphereGeometry(900, 24, 16);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false });
  const dome = new THREE.Mesh(geo, mat);
  return dome;
}

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(SUNSET.fog, 180, 850);
  scene.add(makeSkyDome());

  // Low sun over the western sea.
  const sun = new THREE.DirectionalLight(SUNSET.sun, 2.0);
  sun.position.set(-300, 85, -60);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(SUNSET.hemiSky, SUNSET.hemiGround, 1.25);
  scene.add(hemi);
  scene.add(new THREE.AmbientLight(0x604a5a, 0.5));

  // The sun disc itself, low on the western horizon over the water.
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({ color: SUNSET.sunDisc, fog: false }),
  );
  disc.position.set(-780, 52, -40);
  disc.lookAt(0, 40, 0);
  scene.add(disc);
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(60, 32),
    new THREE.MeshBasicMaterial({ color: 0xff8a4a, transparent: true, opacity: 0.28, fog: false }),
  );
  glow.position.set(-782, 52, -40);
  glow.lookAt(0, 40, 0);
  scene.add(glow);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2200);
  camera.position.set(0, 12, 30);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera };
}

// Third-person chase camera: behind the player, smoothed, looking ahead.
// G.cameraOverride (set by the screenshot stager) takes precedence.
export function updateCamera(G, dt) {
  const cam = G.camera;
  if (G.cameraOverride) {
    if (G.shotMode) {
      // A staged frame is exact: snap, never lerp. Under a virtual-time
      // budget the frames run with tiny deltas and a lerp never converges.
      cam.position.copy(G.cameraOverride.pos);
      cam.lookAt(G.cameraOverride.look);
      return;
    }
    cam.position.lerp(G.cameraOverride.pos, Math.min(1, dt * 6));
    cam.lookAt(G.cameraOverride.look);
    return;
  }
  const p = G.player;
  const dist = p.onFoot ? 7 : p.vehicleKind === 'skiff' ? 13 : 11;
  const height = p.onFoot ? 3.2 : 4.2;
  const fx = Math.sin(p.heading);
  const fz = Math.cos(p.heading);
  const tx = p.pos.x - fx * dist;
  const tz = p.pos.z - fz * dist;
  const ty = height + (p.vehicleKind === 'skiff' ? 1 : 0);
  cam.position.x += (tx - cam.position.x) * Math.min(1, dt * 5);
  cam.position.y += (ty - cam.position.y) * Math.min(1, dt * 5);
  cam.position.z += (tz - cam.position.z) * Math.min(1, dt * 5);
  cam.lookAt(p.pos.x + fx * 8, 1.6, p.pos.z + fz * 8);
}
