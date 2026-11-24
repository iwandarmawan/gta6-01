// Renderer, moonlight, camera. The follow camera lerps behind the player in
// normal play and snaps instantly in shot mode (the virtual-time budget in
// headless runs never lets a lerp converge).
import { NIGHT } from './config.js';

export function makeRender() {
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if ('sRGBEncoding' in THREE) renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(NIGHT.sky);
  scene.fog = new THREE.FogExp2(NIGHT.fog, 0.0032);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

  // Night lighting: dim blue ambient, cold moonlight, a soft hemisphere.
  // Kept bright enough that the city reads in a screenshot.
  scene.add(new THREE.AmbientLight(0x3a4666, 1.25));
  const moon = new THREE.DirectionalLight(NIGHT.moon, 1.0);
  moon.position.set(-120, 180, -220);
  scene.add(moon);
  scene.add(new THREE.HemisphereLight(0x1a2440, 0x0a0a12, 0.85));

  // One headlight spotlight follows the player's car.
  const headlight = new THREE.SpotLight(0xffe9a8, 1.4, 42, 0.5, 0.45, 1.2);
  scene.add(headlight);
  scene.add(headlight.target);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, headlight };
}

export function followCamera(camera, target, heading, dist, height, snap, dt, side) {
  const cx0 = target.x - Math.sin(heading) * dist;
  const cz0 = target.z - Math.cos(heading) * dist;
  // Optional lateral offset (used by staged shots so the chase reads from
  // the side instead of dead behind the car).
  const s = side || 0;
  const cx = cx0 + Math.cos(heading) * s;
  const cz = cz0 - Math.sin(heading) * s;
  if (snap) {
    camera.position.set(cx, height, cz);
  } else {
    const k = Math.min(1, dt * 5);
    camera.position.x += (cx - camera.position.x) * k;
    camera.position.y += (height - camera.position.y) * k;
    camera.position.z += (cz - camera.position.z) * k;
  }
  camera.lookAt(target.x, 1.6, target.z);
}
